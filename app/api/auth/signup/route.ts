export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const nickname = String(body?.nickname || '').trim()
  const password = String(body?.password || '').trim()
  const recoveryCode = String(body?.recoveryCode || '').trim()

  if (!nickname || !password || !recoveryCode) {
    return NextResponse.json(
      { message: 'nickname/password/recoveryCode required' },
      { status: 400 },
    )
  }

  if (password.length < 4) {
    return NextResponse.json({ message: 'password too short' }, { status: 400 })
  }

  if (recoveryCode.length < 2) {
    return NextResponse.json(
      { message: 'recoveryCode too short' },
      { status: 400 },
    )
  }

  const usersRef = adminDb.collection('users')
  const exists = await usersRef.where('nickname', '==', nickname).limit(1).get()

  if (!exists.empty) {
    return NextResponse.json(
      { message: 'nickname already exists' },
      { status: 409 },
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const doc = await usersRef.add({
    nickname,
    passwordHash,
    recoveryCode,
    createdAt: Date.now(),
  })

  return NextResponse.json({ userId: doc.id, nickname })
}
