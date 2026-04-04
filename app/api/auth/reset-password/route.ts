export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const nickname = String(body?.nickname || '').trim()
  const recoveryCode = String(body?.recoveryCode || '').trim()
  const newPassword = String(body?.newPassword || '').trim()

  if (!nickname || !recoveryCode || !newPassword) {
    return NextResponse.json(
      { message: 'nickname/recoveryCode/newPassword required' },
      { status: 400 },
    )
  }

  if (newPassword.length < 4) {
    return NextResponse.json(
      { message: 'newPassword too short' },
      { status: 400 },
    )
  }

  const usersRef = adminDb.collection('users')
  const snap = await usersRef.where('nickname', '==', nickname).limit(1).get()

  if (snap.empty) {
    return NextResponse.json({ message: 'user not found' }, { status: 404 })
  }

  const userDoc = snap.docs[0]
  const data = userDoc.data() as { recoveryCode?: string }

  const savedRecoveryCode = String(data.recoveryCode || '').trim()

  if (!savedRecoveryCode || savedRecoveryCode !== recoveryCode) {
    return NextResponse.json(
      { message: 'invalid recovery code' },
      { status: 401 },
    )
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await userDoc.ref.set(
    {
      passwordHash,
    },
    { merge: true },
  )

  return NextResponse.json({ ok: true })
}
