export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const userId = String(body?.userId || '').trim()
  const recoveryCode = String(body?.recoveryCode || '').trim()

  if (!userId || !recoveryCode) {
    return NextResponse.json(
      { message: 'userId/recoveryCode required' },
      { status: 400 },
    )
  }

  if (recoveryCode.length < 2) {
    return NextResponse.json(
      { message: 'recoveryCode too short' },
      { status: 400 },
    )
  }

  await adminDb
    .collection('users')
    .doc(userId)
    .set({ recoveryCode }, { merge: true })

  return NextResponse.json({ ok: true })
}
