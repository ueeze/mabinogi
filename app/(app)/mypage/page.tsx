'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  loadCharacters,
  saveCharacters,
  Character,
  loadCharactersFromFirestore,
  upsertCharactersToFirestore,
} from '@/lib/characters'
import { loadSession } from '@/lib/session'
import { deleteCharacterFromFirestore } from '@/lib/characters'

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

  const saveBoth = async (next: Character[]) => {
    saveCharacters(next)
    if (!session?.userId) return
    await upsertCharactersToFirestore(session.userId, next)
  }

  useEffect(() => {
    setMounted(true)

    const run = async () => {
      if (!session?.userId) {
        setChars([])
        setDraftNames({})
        return
      }

      try {
        // 1) Firestore 우선
        const fromFs = await loadCharactersFromFirestore(session.userId)

        if (fromFs.length > 0) {
          setChars(fromFs)

          const drafts: Record<string, string> = {}
          for (const c of fromFs) drafts[c.id] = c.name
          setDraftNames(drafts)

          // 다른 페이지가 loadCharacters()로 바로 쓸 수 있게 로컬에도 저장
          saveCharacters(fromFs)
          return
        }

        // 2) Firestore 비어있으면 local fallback
        const local = loadCharacters()
        setChars(local)

        const drafts: Record<string, string> = {}
        for (const c of local) drafts[c.id] = c.name
        setDraftNames(drafts)

        // 3) local에 데이터가 있으면 Firestore 업로드
        if (local.length > 0) {
          await upsertCharactersToFirestore(session.userId, local)
        }
      } catch (e) {
        console.error(e)
        // Firestore 로드 실패해도 local이라도 보여주기
        const local = loadCharacters()
        setChars(local)

        const drafts: Record<string, string> = {}
        for (const c of local) drafts[c.id] = c.name
        setDraftNames(drafts)
      }
    }

    run()
  }, [session?.userId])

  const canAdd = useMemo(() => newName.trim().length > 0, [newName])

  const addChar = async () => {
    const name = newName.trim()
    if (!name) return

    const id = uid()
    const next = [...chars, { id, name, isMain: false }]

    setChars(next)
    setDraftNames((prev) => ({ ...prev, [id]: name }))
    setNewName('')

    try {
      await saveBoth(next)
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했어. 콘솔(F12) 확인해줘!')
    }
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

    try {
      await saveBoth(next)
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했어. 콘솔(F12) 확인해줘!')
      return
    }

    setSavedToast((prev) => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      setSavedToast((prev) => ({ ...prev, [id]: false }))
    }, 1200)
  }

  const deleteChar = async (id: string) => {
    const ok = window.confirm('이 캐릭터를 삭제할까요?')
    if (!ok) return

    let next = chars.filter((c) => c.id !== id)

    if (next.length > 0 && !next.some((c) => c.isMain)) {
      next = next.map((c, i) => ({ ...c, isMain: i === 0 }))
    }

    setChars(next)

    try {
      // Firestore 캐릭터 실제 삭제
      if (session?.userId) {
        await deleteCharacterFromFirestore(session.userId, id)
      }

      await saveBoth(next)
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했어. 콘솔(F12) 확인해줘!')
    }

    setDraftNames((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  const setMainChar = async (id: string) => {
    const next = chars.map((c) => ({ ...c, isMain: c.id === id }))
    setChars(next)

    try {
      await saveBoth(next)
    } catch (e) {
      console.error(e)
      window.alert('저장에 실패했어. 콘솔(F12) 확인해줘!')
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">마이페이지</div>
        <div className="mt-1 text-sm text-gray-600">
          캐릭터 추가/삭제/이름 수정 (본캐는 1명)
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 캐릭터 이름"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
          />
          <button
            onClick={addChar}
            disabled={!canAdd}
            className={`whitespace-nowrap rounded-xl px-5 py-2 text-sm font-medium text-white transition sm:min-w-[96px]
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
            const isMain = !!c.isMain
            const saved = !!savedToast[c.id]
            const saveDisabled = !changed || draft.trim().length === 0

            return (
              <div key={c.id} className="rounded-xl bg-gray-50 px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={draft}
                    onChange={(e) => onChangeDraft(c.id, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                  />

                  <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
                    <button
                      onClick={() => setMainChar(c.id)}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition min-w-[88px]
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
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition min-w-[88px]
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
                      className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 min-w-[88px]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
