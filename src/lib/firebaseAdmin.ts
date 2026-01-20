import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

function getServiceAccount() {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (!p) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is missing')

  const fullPath = path.join(process.cwd(), p)
  const raw = fs.readFileSync(fullPath, 'utf8')
  return JSON.parse(raw)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  })
}

export const adminDb = admin.firestore()
