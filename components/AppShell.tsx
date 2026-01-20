'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { clearSession, loadSession, type SessionUser } from '@/lib/session'

const nav = [
  { href: '/', label: '홈' },
  { href: '/abyss', label: '어비스' },
  { href: '/raid', label: '레이드' },
  { href: '/guild-mission', label: '길드미션' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<SessionUser | null>(null)

  const isAuthPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    const s = loadSession()
    setMe(s)

    if (isAuthPage) return

    if (!s) {
      router.replace('/login')
    }
  }, [isAuthPage, router])

  const onLogout = () => {
    clearSession()
    setMe(null)
    router.replace('/login')
  }

  if (isAuthPage) return <>{children}</>

  // 페이지별 배경 이미지 매핑
  const bgByPath: Record<string, string> = {
    '/': '/mabinogi1.png',
    '/abyss': '/mabinogi6.png',
    '/raid': '/mabinogi5.png',
    '/guild-mission': '/mabinogi3.png',
    '/mypage': '/mabinogi7.png',
  }

  // pathname이 /raid/xxx 같은 형태일 수도 있으니 startsWith로 처리
  const bgImage =
    Object.entries(bgByPath).find(([path]) =>
      path === '/' ? pathname === '/' : pathname.startsWith(path),
    )?.[1] || '/mabinogi1.png'

  /**
   * "위가 잘림" 해결:
   * - bg-top 대신 bg-center 사용
   * - 그리고 "살짝 위로 올려서" 보정하고 싶으면 backgroundPosition을 px로 직접 줌
   *   (양수면 아래로 내려가서 윗부분이 더 보임)
   */
  const backgroundStyle = useMemo(() => {
    return {
      backgroundImage: `url('${bgImage}')`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      // 핵심: center + Y를 조금 내려서(=이미지를 아래로) 윗부분이 더 보이게
      // 0px → 기본(center), 40px/60px 이런 식으로 조절 가능
      backgroundPosition: 'center 60px',
    } as React.CSSProperties
  }, [bgImage])

  return (
    <div className="relative min-h-screen">
      {/* 배경 이미지: 스크롤 길이와 무관하게 화면(뷰포트) 기준으로 고정 */}
      <div className="fixed inset-0" style={backgroundStyle} />

      {/* 오버레이(가독성) */}
      <div className="fixed inset-0 bg-black/35" />

      {/* 실제 콘텐츠 */}
      <div className="relative z-10 min-h-screen">
        {/* 고정 헤더 */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-4 lg:max-w-6xl">
            {/* 왼쪽: 로고/타이틀 */}
            <Link
              href="/"
              className="text-2xl font-extrabold tracking-wide text-gray-900 drop-shadow-sm"
            >
              YUMONGMIN
            </Link>

            {/* 가운데: 상단 네비 */}
            <nav className="hidden items-center gap-2 md:flex">
              {nav.map((n) => {
                const active =
                  n.href === '/'
                    ? pathname === '/'
                    : pathname === n.href || pathname.startsWith(`${n.href}/`)

                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap
                      ${
                        active
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-white/70'
                      }`}
                  >
                    {n.label}
                  </Link>
                )
              })}
            </nav>

            {/* 오른쪽: 닉네임 + 로그아웃 + 마이페이지 */}
            <div className="flex items-center gap-2">
              {me ? (
                <>
                  <span className="hidden text-sm font-medium text-gray-800 sm:inline">
                    {me.nickname}
                  </span>
                  <button
                    onClick={onLogout}
                    className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 whitespace-nowrap"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 whitespace-nowrap"
                >
                  로그인
                </Link>
              )}

              <Link
                href="/mypage"
                className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-white whitespace-nowrap"
              >
                마이페이지
              </Link>
            </div>
          </div>
        </header>

        {/* 본문 */}
        <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6 lg:max-w-6xl">
          {/* 모바일 네비 */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
            {nav.map((n) => {
              const active =
                n.href === '/'
                  ? pathname === '/'
                  : pathname === n.href || pathname.startsWith(`${n.href}/`)

              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap
                    ${
                      active
                        ? 'bg-black text-white'
                        : 'bg-white/70 text-gray-700'
                    }`}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-4">{children}</div>
        </main>
      </div>
    </div>
  )
}
