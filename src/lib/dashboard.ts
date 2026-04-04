import { db } from '@/lib/firebaseClient'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

export type DashboardCharEntry = {
  charName: string
  checks: Record<string, boolean>
}

export type DashboardGuildMission = {
  selectedIds: string[]
  checks: Record<string, boolean>
}

export type DashboardDoc = {
  nickname: string
  mainCharName: string
  abyss: Record<string, DashboardCharEntry>
  raid: Record<string, DashboardCharEntry>
  guildMission: DashboardGuildMission
  updatedAt?: Timestamp
}

function emptyDashboard(nickname = '', mainCharName = ''): DashboardDoc {
  return {
    nickname,
    mainCharName,
    abyss: {},
    raid: {},
    guildMission: {
      selectedIds: [],
      checks: {},
    },
  }
}

export async function loadDashboardDoc(weekKey: string, userId: string) {
  const ref = doc(db, 'weeks', weekKey, 'dashboard', userId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    return null
  }

  const data = snap.data() as Partial<DashboardDoc>

  return {
    nickname: data.nickname || '',
    mainCharName: data.mainCharName || '',
    abyss: data.abyss || {},
    raid: data.raid || {},
    guildMission: data.guildMission || { selectedIds: [], checks: {} },
    updatedAt: data.updatedAt,
  } satisfies DashboardDoc
}

export async function saveDashboardDoc(
  weekKey: string,
  userId: string,
  data: DashboardDoc,
) {
  const ref = doc(db, 'weeks', weekKey, 'dashboard', userId)

  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function ensureDashboardDoc(
  weekKey: string,
  userId: string,
  nickname: string,
  mainCharName: string,
) {
  const existing = await loadDashboardDoc(weekKey, userId)

  if (existing) {
    return existing
  }

  const initial = emptyDashboard(nickname, mainCharName)
  await saveDashboardDoc(weekKey, userId, initial)
  return initial
}
