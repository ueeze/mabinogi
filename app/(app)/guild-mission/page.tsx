'use client'

import { useEffect, useMemo, useState } from 'react'
import { guildMissionFixed, guildMissionPool } from '../../../data/guildMission'
import GuildMissionCard from '../../../components/GuildMissionCard'
import { getWeekKeyKST, getWeekStartKST } from '@/lib/week'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/firebaseClient'
import { getExpireAtFromWeekStart } from '@/lib/expireAt'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

type Mission = { id: string; title: string; desc: string }

function uniq2(arr: string[]) {
  return Array.from(new Set(arr)).slice(0, 2)
}

export default function GuildMissionPage() {
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
  const [loading, setLoading] = useState(false)

  // 선택 2개
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // 체크 상태
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({})

  // Firestore 경로(유저 단위)
  // weeks/{weekKey}/users/{userId}/guildMission/main
  const gmDocRef = useMemo(() => {
    if (!session?.userId) return null
    return doc(
      db,
      'weeks',
      weekKey,
      'users',
      session.userId,
      'guildMission',
      'main',
    )
  }, [session?.userId, weekKey])

  useEffect(() => {
    setMounted(true)
  }, [])

  // 최초 로드: Firestore에서 selected/checks 가져오기
  useEffect(() => {
    if (!mounted) return
    if (!session?.userId) return
    if (!gmDocRef) return

    const run = async () => {
      setLoading(true)
      try {
        // 사용자 문서 닉네임/updatedAt 기록(홈에서 users 목록 잡히게)
        await setDoc(
          doc(db, 'weeks', weekKey, 'users', session.userId),
          {
            nickname: session.nickname,
            updatedAt: serverTimestamp(),
            expireAt,
          },
          { merge: true },
        )

        const snap = await getDoc(gmDocRef)
        if (snap.exists()) {
          const data = snap.data() as {
            selected?: string[]
            checks?: Record<string, boolean>
          }
          setSelectedIds(
            Array.isArray(data.selected) ? uniq2(data.selected) : [],
          )
          setCheckedMap(data.checks || {})
        } else {
          setSelectedIds([])
          setCheckedMap({})
        }
      } catch (e) {
        console.error(e)
        window.alert(
          '길드미션을 불러오는데 실패했습니다. 콘솔(F12)을 확인해주세요.',
        )
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [mounted, session?.userId, session?.nickname, weekKey, gmDocRef, expireAt])

  // 이번 주에 보여줄 미션(고정 1 + 선택 2)
  const visibleMissions: Mission[] = useMemo(() => {
    const picked = guildMissionPool.filter((m) => selectedIds.includes(m.id))
    return [guildMissionFixed, ...picked]
  }, [selectedIds])

  const selectionDone = selectedIds.length === 2

  const togglePick = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  // 선택 2개 저장(Firestore)
  const saveSelection = async () => {
    if (!session?.userId) return
    if (!gmDocRef) return

    if (selectedIds.length !== 2) {
      window.alert('선택 미션은 정확히 2개를 골라야 합니다.')
      return
    }

    try {
      setLoading(true)

      // 문서 생성/갱신
      await setDoc(
        gmDocRef,
        {
          selected: uniq2(selectedIds),
          updatedAt: serverTimestamp(),
          expireAt,
        },
        { merge: true },
      )

      // 상위 users/{userId}도 갱신
      await setDoc(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        {
          nickname: session.nickname,
          updatedAt: serverTimestamp(),
          expireAt,
        },
        { merge: true },
      )

      window.alert('이번 주 길드미션(선택 2개) 저장 완료!')
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했습니다. 콘솔(F12)을 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 체크 1개 토글(Firestore) - 고정/선택 모두 같은 체크맵에 저장
  const toggleOne = async (missionId: string) => {
    if (!session?.userId) return
    if (!gmDocRef) return
    if (!selectionDone) {
      window.alert('먼저 이번 주 선택 미션 2개를 저장해주세요.')
      return
    }

    const current = checkedMap[missionId] ?? false
    const nextValue = !current

    // UI 먼저 반영
    setCheckedMap((prev) => ({ ...prev, [missionId]: nextValue }))

    try {
      // 문서 존재 보장 + checks 한 칸만 업데이트
      await setDoc(
        gmDocRef,
        { selected: uniq2(selectedIds), expireAt },
        { merge: true },
      )

      await updateDoc(gmDocRef, {
        [`checks.${missionId}`]: nextValue,
        updatedAt: serverTimestamp(),
        expireAt,
      })

      await setDoc(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        { updatedAt: serverTimestamp(), nickname: session.nickname, expireAt },
        { merge: true },
      )
    } catch (e) {
      // 실패 시 롤백
      setCheckedMap((prev) => ({ ...prev, [missionId]: current }))
      console.error(e)
      window.alert('저장에 실패했습니다. 콘솔(F12)을 확인해주세요.')
    }
  }

  const total = visibleMissions.length
  const done = visibleMissions.filter((m) => checkedMap[m.id]).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const barPercent = Math.max(0, Math.min(100, percent))

  const allDone =
    total > 0 && visibleMissions.every((m) => checkedMap[m.id] === true)

  const toggleAll = async () => {
    if (!session?.userId) return
    if (!gmDocRef) return
    if (!selectionDone) {
      window.alert('먼저 이번 주 선택 미션 2개를 저장해주세요.')
      return
    }

    const nextValue = !allDone

    // UI 반영
    const next: Record<string, boolean> = { ...checkedMap }
    for (const m of visibleMissions) next[m.id] = nextValue
    setCheckedMap(next)

    try {
      const updates: Record<string, any> = {
        updatedAt: serverTimestamp(),
        expireAt,
      }
      for (const m of visibleMissions) updates[`checks.${m.id}`] = nextValue

      await setDoc(
        gmDocRef,
        {
          selected: uniq2(selectedIds),
          updatedAt: serverTimestamp(),
          expireAt,
        },
        { merge: true },
      )

      await updateDoc(gmDocRef, updates)

      await setDoc(
        doc(db, 'weeks', weekKey, 'users', session.userId),
        { updatedAt: serverTimestamp(), nickname: session.nickname, expireAt },
        { merge: true },
      )
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했습니다. 콘솔(F12)을 확인해주세요.')
    }
  }

  if (!mounted) return null

  if (!session?.userId) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">길드미션</div>
        <div className="mt-1 text-sm text-gray-700">로그인이 필요합니다.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">길드미션</div>
        <div className="mt-1 text-sm text-gray-600">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full">
            <div className="text-lg font-semibold text-gray-900">길드미션</div>
            <div className="mt-1 text-sm text-gray-600">
              이번 주 기준: {weekKey} (월 06:00 시작)
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
              <div className="font-semibold text-gray-900">
                이번 주 선택 미션 (2개 선택)
              </div>
              <div className="mt-1 text-sm text-gray-600">
                주말 퀘스트는 고정, 아래 풀 6개 중 2개를 선택해야 합니다.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {guildMissionPool.map((m) => {
                  const checked = selectedIds.includes(m.id)
                  const disabled = !checked && selectedIds.length >= 2
                  return (
                    <button
                      key={m.id}
                      onClick={() => togglePick(m.id)}
                      disabled={disabled}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition whitespace-nowrap
                        ${
                          checked
                            ? 'bg-black text-white'
                            : disabled
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-white text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                      <span>{m.title}</span>
                      <span className="text-xs opacity-80">
                        {checked ? '선택됨' : '선택'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-700">
                  선택:{' '}
                  <span className="font-medium">{selectedIds.length}</span>
                  /2
                </div>
                <button
                  onClick={saveSelection}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  이번 주 미션 저장
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-700">
              <div className="font-medium">
                전체 완료율: {percent}% ({done}/{total})
              </div>

              <div className="mt-2 w-full">
                <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-yellow-300 transition-all"
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    if (!selectionDone) {
                      window.alert('먼저 이번 주 선택 미션 2개를 저장해주세요.')
                      return
                    }
                    const action = allDone ? '전체 해제' : '전체 완료'
                    const ok = window.confirm(`길드미션을 ${action}할까요?`)
                    if (!ok) return
                    toggleAll()
                  }}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {allDone ? '전체 해제' : '전체 완료'}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-sm text-gray-500">이번 주</div>
        </div>
      </div>

      {!selectionDone ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="font-semibold text-gray-900">체크를 시작하려면</div>
          <div className="mt-1 text-sm text-gray-600">
            위에서 이번 주 선택 미션 2개를 고르고 저장해주세요.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
          {visibleMissions.map((item) => (
            <GuildMissionCard
              key={item.id}
              item={item}
              checked={!!checkedMap[item.id]}
              onToggle={toggleOne}
            />
          ))}
        </div>
      )}
    </div>
  )
}
