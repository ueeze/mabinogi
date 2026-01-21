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
    if (!s) router.replace('/login')
  }, [isAuthPage, router])

  const onLogout = () => {
    clearSession()
    setMe(null)
    router.replace('/login')
  }

  if (isAuthPage) return <>{children}</>

  const bgByPath: Record<string, string> = {
    '/': '/mabinogi1.png',
    '/abyss': '/mabinogi6.png',
    '/raid': '/mabinogi5.png',
    '/guild-mission': '/mabinogi3.png',
    '/mypage': '/mabinogi7.png',
  }

  const bgImage =
    Object.entries(bgByPath).find(([path]) =>
      path === '/' ? pathname === '/' : pathname.startsWith(path),
    )?.[1] || '/mabinogi1.png'

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `url('${bgImage}')`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center 60px',
    }),
    [bgImage],
  )

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0" style={backgroundStyle} />
      <div className="fixed inset-0 bg-black/35" />

      <div className="relative z-10 min-h-screen">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-4 py-3">
            {/* 모바일 헤더 */}
            <div className="flex items-center justify-between md:hidden">
              <Link
                href="/"
                className="text-lg font-extrabold tracking-wide text-gray-900"
              >
                YUMONGMIN
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/mypage"
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-800"
                >
                  마이페이지
                </Link>
                <button
                  onClick={onLogout}
                  className="rounded-full bg-black px-3 py-1 text-sm font-medium text-white"
                >
                  로그아웃
                </button>
              </div>
            </div>

            {/* 데스크톱 헤더 */}
            <div className="hidden md:flex items-center justify-between">
              <Link
                href="/"
                className="text-2xl font-extrabold tracking-wide text-gray-900"
              >
                YUMONGMIN
              </Link>

              <nav className="flex items-center gap-2">
                {nav.map((n) => {
                  const active =
                    n.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(n.href)

                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`rounded-full px-4 py-2 text-sm font-medium
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

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {me?.nickname}
                </span>
                <button
                  onClick={onLogout}
                  className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                >
                  로그아웃
                </button>
                <Link
                  href="/mypage"
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800"
                >
                  마이페이지
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 모바일 네비 */}
        <nav className="md:hidden flex gap-2 overflow-x-auto px-4 py-3">
          {nav.map((n) => {
            const active =
              n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)

            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium
                  ${
                    active ? 'bg-black text-white' : 'bg-white/70 text-gray-700'
                  }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4">
          {children}
        </main>
      </div>
    </div>
  )
}
