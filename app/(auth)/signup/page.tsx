'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveSession } from '@/lib/session'
import { clearLegacyCharacters } from '@/lib/characters'

export default function SignupPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSignup = async () => {
    setError(null)
    const n = nickname.trim()
    const p = password.trim()

    if (!n || !p) {
      setError('닉네임/비밀번호를 입력해주세요.')
      return
    }
    if (p.length < 4) {
      setError('비밀번호는 4자 이상으로 해주세요.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: n, password: p }),
      })

      if (!res.ok) {
        if (res.status === 409) setError('이미 사용 중인 닉네임입니다.')
        else setError('회원가입 실패. 다시 시도해주세요.')
        return
      }

      const data = (await res.json()) as { userId: string; nickname: string }
      saveSession({ userId: data.userId, nickname: data.nickname })
      clearLegacyCharacters()
      router.replace('/')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen px-4 py-10">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: "url('/mabinogi2.png')" }}
      />

      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black/35" />

      {/* 콘텐츠 */}
      <div className="relative z-10">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="text-xl font-semibold text-gray-900">회원가입</div>
          <div className="mt-1 text-sm text-gray-600">
            유몽민 전용 계정 생성
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호(4자 이상)"
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <button
              onClick={onSignup}
              disabled={loading}
              className={`w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition whitespace-nowrap ${
                loading ? 'bg-gray-300' : 'bg-black hover:opacity-90'
              }`}
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>

            <div className="text-center text-sm text-gray-700">
              이미 계정이 있으면{' '}
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
