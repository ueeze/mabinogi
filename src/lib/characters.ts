import { loadSession } from '@/lib/session'
import { db } from '@/lib/firebaseClient'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

export type Character = { id: string; name: string; isMain?: boolean }

const LEGACY_KEY = 'guildCharacters'

function getKey() {
  if (typeof window === 'undefined') return null
  const s = loadSession()
  if (!s?.userId) return null
  return `guildCharacters:${s.userId}`
}

function normalizeMain(chars: Character[]) {
  if (chars.length === 0) return chars

  const hasMain = chars.some((c) => c.isMain)
  if (!hasMain) {
    return chars.map((c, idx) => ({ ...c, isMain: idx === 0 }))
  }

  let first = true
  return chars.map((c) => {
    if (c.isMain && first) {
      first = false
      return c
    }
    if (c.isMain && !first) return { ...c, isMain: false }
    return c
  })
}

// 예전 전역 키 데이터 제거(회원가입/로그인 직후 1회 호출하면 됨)
export function clearLegacyCharacters() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LEGACY_KEY)
}

export function loadCharacters(): Character[] {
  const key = getKey()
  if (!key) return []

  try {
    const saved = localStorage.getItem(key)
    if (!saved) return []
    const parsed = JSON.parse(saved) as Character[]
    const normalized = normalizeMain(parsed)

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(key, JSON.stringify(normalized))
    }

    return normalized
  } catch {
    return []
  }
}

export function saveCharacters(chars: Character[]) {
  const key = getKey()
  if (!key) return
  const normalized = normalizeMain(chars)
  localStorage.setItem(key, JSON.stringify(normalized))
}

/* =========================
   Firestore helpers (홈에서 모든 유저 캐릭터를 보이게 하려면 필요)
   경로: users/{userId}/characters/{charId}
========================= */

export async function loadCharactersFromFirestore(userId: string) {
  const snap = await getDocs(collection(db, 'users', userId, 'characters'))
  return snap.docs.map((d) => {
    const data = d.data() as { name?: string; isMain?: boolean }
    return { id: d.id, name: String(data?.name || ''), isMain: !!data?.isMain }
  })
}

export async function upsertCharactersToFirestore(
  userId: string,
  chars: Character[],
) {
  const normalized = normalizeMain(chars)
  const col = collection(db, 'users', userId, 'characters')

  await Promise.all(
    normalized.map((c) =>
      setDoc(
        doc(col, c.id),
        { name: c.name, isMain: !!c.isMain, updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
}

export async function deleteCharacterFromFirestore(
  userId: string,
  charId: string,
) {
  await deleteDoc(doc(db, 'users', userId, 'characters', charId))
}
