// app/layout.tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'YUMONGMIN',
  description: 'YUMONGMIN - Mabinogi Mobile',

  openGraph: {
    title: 'YUMONGMIN',
    description: 'YUMONGMIN - Mabinogi Mobile',
    url: 'https://mabinogi-inky.vercel.app',
    siteName: 'YUMONGMIN',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'YUMONGMIN',
    description: 'YUMONGMIN - Mabinogi Mobile',
  },
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
