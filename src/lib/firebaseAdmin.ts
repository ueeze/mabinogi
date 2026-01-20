// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    // Vercel 환경변수에 JSON 통째로 넣는 방식
    const parsed = JSON.parse(raw) as ServiceAccount

    // 혹시 private_key가 \n 문자열로 들어오는 경우 복구
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    }

    return parsed
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON. Check formatting.',
    )
  }
}

function parseServiceAccountFromFile(): ServiceAccount | null {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!p) return null

  const fullPath = path.join(process.cwd(), p)

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_PATH is set but file not found: ${fullPath}`,
    )
  }

  const raw = fs.readFileSync(fullPath, 'utf8')
  const parsed = JSON.parse(raw) as ServiceAccount

  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
  }

  return parsed
}

function getServiceAccount(): ServiceAccount {
  // 1) 배포(Vercel): env JSON 우선
  const fromEnv = parseServiceAccountFromEnv()
  if (fromEnv) return fromEnv

  // 2) 로컬: 파일 경로 지원(기존 방식)
  const fromFile = parseServiceAccountFromFile()
  if (fromFile) return fromFile

  // 둘 다 없으면 에러
  throw new Error(
    'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON (recommended for Vercel) or FIREBASE_SERVICE_ACCOUNT_PATH (local file).',
  )
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      getServiceAccount() as admin.ServiceAccount,
    ),
  })
}

export const adminDb = admin.firestore()
