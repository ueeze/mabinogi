export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import { getWeekKeyKST } from '@/lib/week'

type CharacterDoc = {
  name?: string
  isMain?: boolean
}

export async function POST() {
  try {
    const weekKey = getWeekKeyKST()

    const usersSnap = await adminDb.collection('users').get()

    let createdCount = 0
    let skippedCount = 0

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id
      const userData = userDoc.data() as { nickname?: string }

      const dashboardRef = adminDb
        .collection('weeks')
        .doc(weekKey)
        .collection('dashboard')
        .doc(userId)

      const weeklyUserRef = adminDb
        .collection('weeks')
        .doc(weekKey)
        .collection('users')
        .doc(userId)

      const nickname = String(userData?.nickname || '길드원')

      // users 문서는 항상 만들어 둠
      await weeklyUserRef.set(
        {
          nickname,
          updatedAt: Date.now(),
        },
        { merge: true },
      )

      const dashboardSnap = await dashboardRef.get()

      // 이미 dashboard가 있으면 건너뜀
      if (dashboardSnap.exists) {
        skippedCount++
        continue
      }

      const charsSnap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('characters')
        .get()

      const chars = charsSnap.docs.map((d) => {
        const data = d.data() as CharacterDoc
        return {
          id: d.id,
          name: String(data?.name || '캐릭터'),
          isMain: !!data?.isMain,
        }
      })

      const mainChar = chars.find((c) => c.isMain) || chars[0]

      const abyss: Record<
        string,
        { charName: string; checks: Record<string, boolean> }
      > = {}
      const raid: Record<
        string,
        { charName: string; checks: Record<string, boolean> }
      > = {}

      for (const c of chars) {
        abyss[c.id] = {
          charName: c.name,
          checks: {},
        }

        raid[c.id] = {
          charName: c.name,
          checks: {},
        }
      }

      await dashboardRef.set({
        nickname,
        mainCharName: mainChar?.name || nickname,
        abyss,
        raid,
        guildMission: {
          selectedIds: [],
          checks: {},
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      createdCount++
    }

    return NextResponse.json({
      ok: true,
      weekKey,
      createdCount,
      skippedCount,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { ok: false, message: 'failed to generate week dashboard' },
      { status: 500 },
    )
  }
}
