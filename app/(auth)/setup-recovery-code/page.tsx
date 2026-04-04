'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadSession } from '@/lib/session'

export default function SetupRecoveryCodePage() {
  const router = useRouter()
  const session = useMemo(
    () => (typeof window === 'undefined' ? null : loadSession()),
    [],
  )

  const [recoveryCode, setRecoveryCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSave = async () => {
    setError(null)

    const r1 = recoveryCode.trim()
    const r2 = confirmCode.trim()

    if (!session?.userId) {
      setError('로그인 정보가 없습니다. 다시 로그인해주세요.')
      return
    }

    if (!r1 || !r2) {
      setError('복구코드를 모두 입력해주세요.')
      return
    }

    if (r1.length < 2) {
      setError('복구코드는 2자 이상으로 해주세요.')
      return
    }

    if (r1 !== r2) {
      setError('복구코드가 서로 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          recoveryCode: r1,
        }),
      })

      if (!res.ok) {
        setError('복구코드 저장에 실패했습니다.')
        return
      }

      router.replace('/')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-10">
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: "url('/mabinogi2.png')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="text-xl font-semibold text-gray-900">
            복구코드 설정
          </div>
          <div className="mt-1 text-sm text-gray-600">
            비밀번호를 잊었을 때 사용할 복구코드를 설정해주세요.
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="복구코드"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder="복구코드 확인"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button
              onClick={onSave}
              disabled={loading}
              className={`w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition whitespace-nowrap ${
                loading ? 'bg-gray-300' : 'bg-black hover:opacity-90'
              }`}
            >
              {loading ? '저장 중...' : '복구코드 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
