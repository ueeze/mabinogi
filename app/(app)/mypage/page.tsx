'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadCharacters, saveCharacters, Character } from '@/lib/characters'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/firebaseClient'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

function uid() {
  return 'char-' + Math.random().toString(36).slice(2, 10)
}

export default function MyPage() {
  const [mounted, setMounted] = useState(false)

  const [chars, setChars] = useState<Character[]>([])
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [savedToast, setSavedToast] = useState<Record<string, boolean>>({})
  const [newName, setNewName] = useState('')

  const session = useMemo(
    () => (typeof window === 'undefined' ? null : loadSession()),
    [],
  )

  const syncCharactersToFirestore = async (nextChars: Character[]) => {
    if (!session?.userId) return

    const userId = session.userId
    const colRef = collection(db, 'users', userId, 'characters')

    const batch = writeBatch(db)

    // 기존 문서들 확인해서 (삭제된 캐릭터) 정리
    const existingSnap = await getDocs(colRef)
    const existingIds = new Set(existingSnap.docs.map((d) => d.id))
    const nextIds = new Set(nextChars.map((c) => c.id))

    for (const id of existingIds) {
      if (!nextIds.has(id)) {
        batch.delete(doc(db, 'users', userId, 'characters', id))
      }
    }

    // 현재 캐릭터들 upsert
    for (const c of nextChars) {
      batch.set(
        doc(db, 'users', userId, 'characters', c.id),
        {
          name: c.name,
          isMain: !!c.isMain,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    // 유저 문서도 닉네임/업데이트 시간 유지 (홈에서 유저명 표시용으로 쓸 수 있음)
    batch.set(
      doc(db, 'users', userId),
      { nickname: session.nickname, updatedAt: serverTimestamp() },
      { merge: true },
    )

    await batch.commit()
  }

  const saveBoth = async (next: Character[]) => {
    // 로컬 저장(기존 로직 유지)
    saveCharacters(next)

    // Firestore 저장(근본 해결)
    try {
      await syncCharactersToFirestore(next)
    } catch (e) {
      console.error(e)
      window.alert(
        '캐릭터 Firestore 저장에 실패했습니다. 콘솔(F12)을 확인해주세요!',
      )
    }
  }

  useEffect(() => {
    setMounted(true)

    const loaded = loadCharacters()
    setChars(loaded)

    const drafts: Record<string, string> = {}
    for (const c of loaded) drafts[c.id] = c.name
    setDraftNames(drafts)

    // 처음 들어왔을 때도 한번 동기화
    if (loaded.length > 0) {
      saveBoth(loaded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canAdd = useMemo(() => newName.trim().length > 0, [newName])

  const addChar = async () => {
    const name = newName.trim()
    if (!name) return

    const id = uid()

    const next = [...chars, { id, name, isMain: false }]
    setChars(next)
    setDraftNames((prev) => ({ ...prev, [id]: name }))
    setNewName('')

    await saveBoth(next)
  }

  const onChangeDraft = (id: string, value: string) => {
    setDraftNames((prev) => ({ ...prev, [id]: value }))
  }

  const saveName = async (id: string) => {
    const nextName = (draftNames[id] ?? '').trim()
    if (!nextName) {
      window.alert('이름은 비워둘 수 없습니다.')
      return
    }

    const next = chars.map((c) => (c.id === id ? { ...c, name: nextName } : c))
    setChars(next)
    await saveBoth(next)

    setSavedToast((prev) => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      setSavedToast((prev) => ({ ...prev, [id]: false }))
    }, 1200)
  }

  const deleteChar = async (id: string) => {
    const ok = window.confirm('이 캐릭터를 삭제할까요?')
    if (!ok) return

    const next = chars.filter((c) => c.id !== id)

    // 만약 본캐가 삭제되면, 남아있는 첫 캐릭터를 자동 본캐로(있다면)
    if (next.length > 0) {
      const hasMain = next.some((c) => c.isMain)
      if (!hasMain) {
        next[0] = { ...next[0], isMain: true }
        for (let i = 1; i < next.length; i++)
          next[i] = { ...next[i], isMain: false }
      }
    }

    setChars(next)
    await saveBoth(next)

    setDraftNames((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  const setMainChar = async (id: string) => {
    const next = chars.map((c) => ({ ...c, isMain: c.id === id }))
    setChars(next)
    await saveBoth(next)
  }

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">마이페이지</div>
        <div className="mt-1 text-sm text-gray-600">
          캐릭터 추가/삭제/이름 수정 (본캐는 1명만 선택 가능)
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 캐릭터 이름"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
          />
          <button
            onClick={addChar}
            disabled={!canAdd}
            className={`shrink-0 whitespace-nowrap rounded-xl px-5 py-2 text-sm font-medium text-white transition min-w-[88px]
              ${canAdd ? 'bg-black hover:opacity-90' : 'bg-gray-300'}`}
          >
            추가
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="font-semibold text-gray-900">내 캐릭터</div>

        <div className="mt-3 space-y-2">
          {chars.map((c) => {
            const draft = draftNames[c.id] ?? ''
            const changed = draft.trim() !== c.name
            const saved = !!savedToast[c.id]
            const saveDisabled = !changed || draft.trim().length === 0
            const isMain = !!c.isMain

            return (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <input
                  value={draft}
                  onChange={(e) => onChangeDraft(c.id, e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none"
                />

                <button
                  onClick={() => setMainChar(c.id)}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition min-w-[88px]
                    ${
                      isMain
                        ? 'bg-yellow-300 text-black'
                        : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                >
                  {isMain ? '본캐' : '본캐로'}
                </button>

                <button
                  onClick={() => saveName(c.id)}
                  disabled={saveDisabled}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition min-w-[88px]
                    ${
                      saveDisabled
                        ? 'bg-white text-gray-400'
                        : 'bg-black text-white hover:opacity-90'
                    }`}
                >
                  {saved ? '저장됨' : '저장'}
                </button>

                <button
                  onClick={() => deleteChar(c.id)}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 min-w-[88px]"
                >
                  삭제
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
