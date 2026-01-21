'use client'

import { useEffect, useMemo, useState } from 'react'
import { raidList } from '../../../data/raid'
import ContentCard from '../../../components/ContentCard'
import type { Character } from '@/lib/characters'
import {
  loadCharacters,
  loadCharactersFromFirestore,
  upsertCharactersToFirestore,
} from '@/lib/characters'
import { getWeekKeyKST, getWeekStartKST } from '@/lib/week'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/firebaseClient'
import { getExpireAtFromWeekStart } from '@/lib/expireAt'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

export default function RaidPage() {
  const weekKey = useMemo(() => getWeekKeyKST(), [])
  const expireAt = useMemo(
    () => getExpireAtFromWeekStart(getWeekStartKST()),
    [],
  )
  const session = useMemo(
    () => (typeof window === 'undefined' ? null : loadSession()),
    [],
  )

  const [mounted, setMounted] = useState(false)
  const [myCharacters, setMyCharacters] = useState<Character[]>([])
  const [checkedMap, setCheckedMap] = useState<
    Record<string, Record<string, boolean>>
  >({})

  useEffect(() => {
    setMounted(true)

    const run = async () => {
      try {
        const s = loadSession()
        if (!s?.userId) {
          setMyCharacters([])
          return
        }

        // 1) Firestore에서 먼저 로드
        const fromFs = await loadCharactersFromFirestore(s.userId)
        if (fromFs.length > 0) {
          setMyCharacters(fromFs)
          return
        }

        // 2) Firestore가 비어있으면 (기존 PC 유저 대비) localStorage에서 가져와 업로드
        const local = loadCharacters()
        setMyCharacters(local)

        if (local.length > 0) {
          await upsertCharactersToFirestore(s.userId, local)
        }
      } catch {
        setMyCharacters([])
      }
    }

    run()
  }, [])

  // Firestore에서 이번 주 내 레이드 체크 로드
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!session?.userId) return

      await setDoc(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        {
          nickname: session.nickname,
          updatedAt: serverTimestamp(),
          expireAt,
        },
        { merge: true },
      )

      const colRef = collection(
        db,
        'weeks',
        weekKey,
        'users',
        session.userId,
        'raidChars',
      )
      const snap = await getDocs(colRef)

      const next: Record<string, Record<string, boolean>> = {}
      snap.forEach((d) => {
        const data = d.data() as { checks?: Record<string, boolean> }
        next[d.id] = data.checks || {}
      })

      if (!cancelled) setCheckedMap(next)
    }

    if (mounted) run()

    return () => {
      cancelled = true
    }
  }, [mounted, session?.userId, session?.nickname, weekKey, expireAt])

  const toggleOne = async (charId: string, contentId: string) => {
    if (!session?.userId) return

    const current = checkedMap[charId]?.[contentId] ?? false
    const nextValue = !current

    // UI 반영
    setCheckedMap((prev) => {
      const charMap = prev[charId] || {}
      return { ...prev, [charId]: { ...charMap, [contentId]: nextValue } }
    })

    try {
      const char = myCharacters.find((c) => c.id === charId)
      const docRef = doc(
        db,
        'weeks',
        weekKey,
        'users',
        session.userId,
        'raidChars',
        charId,
      )

      // 문서 존재 보장(여기서 checks를 절대 건드리지 않음)
      await setDoc(
        docRef,
        { name: char?.name ?? '캐릭터', expireAt },
        { merge: true },
      )

      // 체크 1개만 업데이트(기존 checks 유지됨)
      await updateDoc(docRef, { [`checks.${contentId}`]: nextValue, expireAt })

      await setDoc(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        { updatedAt: serverTimestamp(), nickname: session.nickname, expireAt },
        { merge: true },
      )
    } catch (e) {
      // 실패했으면 UI 롤백
      setCheckedMap((prev) => {
        const charMap = prev[charId] || {}
        return { ...prev, [charId]: { ...charMap, [contentId]: current } }
      })
      console.error(e)
      window.alert('저장에 실패했습니다. 콘솔(F12)을 확인해주세요.')
    }
  }

  const isAllDoneForChar = (charId: string) => {
    const current = checkedMap[charId] || {}
    if (raidList.length === 0) return false
    return raidList.every((a) => current[a.id] === true)
  }

  const toggleAllForChar = async (charId: string) => {
    if (!session?.userId) return

    const prevCharMap = checkedMap[charId] || {}

    const allDone =
      raidList.length > 0 && raidList.every((a) => prevCharMap[a.id] === true)
    const nextValue = !allDone

    // UI 반영
    setCheckedMap((prev) => {
      const nextCharMap: Record<string, boolean> = { ...(prev[charId] || {}) }
      for (const a of raidList) nextCharMap[a.id] = nextValue
      return { ...prev, [charId]: nextCharMap }
    })

    try {
      const char = myCharacters.find((c) => c.id === charId)
      const docRef = doc(
        db,
        'weeks',
        weekKey,
        'users',
        session.userId,
        'raidChars',
        charId,
      )

      const batch = writeBatch(db)

      // 문서 존재 보장(여기서도 checks를 절대 건드리지 않음)
      batch.set(
        docRef,
        { name: char?.name ?? '캐릭터', expireAt },
        { merge: true },
      )

      const updates: Record<string, any> = { expireAt }
      for (const a of raidList) updates[`checks.${a.id}`] = nextValue
      batch.update(docRef, updates)

      batch.set(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        { updatedAt: serverTimestamp(), nickname: session.nickname, expireAt },
        { merge: true },
      )

      await batch.commit()
    } catch (e) {
      // 실패했으면 UI 롤백
      setCheckedMap((prev) => ({ ...prev, [charId]: prevCharMap }))
      console.error(e)
      window.alert('저장에 실패했어. 콘솔(F12) 확인해줘!')
    }
  }

  const totalContents = raidList.length

  const charRate = (charId: string) => {
    const doneCount = Object.values(checkedMap[charId] || {}).filter(
      Boolean,
    ).length
    const percent =
      totalContents === 0 ? 0 : Math.round((doneCount / totalContents) * 100)
    return { doneCount, percent }
  }

  const overallRate = () => {
    if (myCharacters.length === 0) return { done: 0, total: 0, percent: 0 }

    const total = myCharacters.length * totalContents
    let done = 0

    for (const c of myCharacters) {
      done += Object.values(checkedMap[c.id] || {}).filter(Boolean).length
    }

    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { done, total, percent }
  }

  const overall = overallRate()
  const barPercent = Math.max(0, Math.min(100, overall.percent))

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-lg font-semibold text-gray-900">레이드</div>
          <div className="mt-1 text-sm text-gray-600">불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!session?.userId) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">레이드</div>
        <div className="mt-1 text-sm text-gray-700">로그인이 필요합니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full">
            <div className="text-lg font-semibold text-gray-900">레이드</div>
            <div className="mt-1 text-sm text-gray-700">
              이번 주 기준: {weekKey} (월 06:00 시작)
            </div>

            <div className="mt-3 text-sm text-gray-800">
              <div className="font-medium">
                전체 완료율: {overall.percent}% ({overall.done}/{overall.total})
              </div>

              <div className="mt-2 w-full">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-yellow-300 transition-all"
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid w-full grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myCharacters.map((c) => {
                  const r = charRate(c.id)
                  const p = Math.max(0, Math.min(100, r.percent))

                  return (
                    <div
                      key={c.id}
                      className="h-full w-full rounded-2xl bg-gray-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {c.name}
                        </span>
                        <span className="text-sm text-gray-700">
                          {r.percent}% ({r.doneCount}/{totalContents})
                        </span>
                      </div>

                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-yellow-300 transition-all"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {myCharacters.map((c) => {
                  const allDone = isAllDoneForChar(c.id)
                  const action = allDone ? '전체 해제' : '전체 완료'
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        const ok = window.confirm(
                          `${c.name} 레이드를 ${action}할까요?`,
                        )
                        if (!ok) return
                        toggleAllForChar(c.id)
                      }}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      {c.name} {action}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-sm text-gray-500">이번 주</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {raidList.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            characters={myCharacters}
            checkedMap={checkedMap}
            onToggle={toggleOne}
          />
        ))}
      </div>
    </div>
  )
}
