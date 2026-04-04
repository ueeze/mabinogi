'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onReset = async () => {
    setError(null)
    setSuccess(null)

    const n = nickname.trim()
    const r = recoveryCode.trim()
    const p1 = newPassword.trim()
    const p2 = confirmPassword.trim()

    if (!n || !r || !p1 || !p2) {
      setError('닉네임/복구코드/새 비밀번호를 모두 입력해주세요.')
      return
    }

    if (p1.length < 4) {
      setError('새 비밀번호는 4자 이상으로 해주세요.')
      return
    }

    if (p1 !== p2) {
      setError('새 비밀번호가 서로 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: n,
          recoveryCode: r,
          newPassword: p1,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setError('복구코드가 올바르지 않습니다.')
        } else if (res.status === 404) {
          setError('해당 닉네임의 계정을 찾을 수 없습니다.')
        } else {
          setError('비밀번호 재설정에 실패했습니다.')
        }
        return
      }

      setSuccess('비밀번호가 재설정되었습니다. 로그인 페이지로 이동합니다.')
      window.setTimeout(() => {
        router.replace('/login')
      }, 1200)
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
            비밀번호 재설정
          </div>
          <div className="mt-1 text-sm text-gray-600">
            닉네임과 복구코드를 입력해 새 비밀번호를 설정하세요.
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            <input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="복구코드"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호(4자 이상)"
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 확인"
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            {success ? (
              <div className="text-sm text-green-700">{success}</div>
            ) : null}

            <button
              onClick={onReset}
              disabled={loading}
              className={`w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition whitespace-nowrap ${
                loading ? 'bg-gray-300' : 'bg-black hover:opacity-90'
              }`}
            >
              {loading ? '재설정 중...' : '비밀번호 재설정'}
            </button>

            <div className="text-center text-sm text-gray-700">
              로그인으로 돌아가기{' '}
              <Link
                href="/login"
                className="font-medium text-gray-900 underline"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
