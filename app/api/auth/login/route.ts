import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const nickname = String(body?.nickname || '').trim()
  const password = String(body?.password || '').trim()

  if (!nickname || !password) {
    return NextResponse.json(
      { message: 'nickname/password required' },
      { status: 400 },
    )
  }

  const usersRef = adminDb.collection('users')
  const snap = await usersRef.where('nickname', '==', nickname).limit(1).get()

  if (snap.empty) {
    return NextResponse.json(
      { message: 'invalid credentials' },
      { status: 401 },
    )
  }

  const doc = snap.docs[0]
  const data = doc.data() as { passwordHash: string; nickname: string }

  const ok = await bcrypt.compare(password, data.passwordHash)
  if (!ok) {
    return NextResponse.json(
      { message: 'invalid credentials' },
      { status: 401 },
    )
  }

  return NextResponse.json({ userId: doc.id, nickname: data.nickname })
}
