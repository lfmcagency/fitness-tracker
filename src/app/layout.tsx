export const dynamic = 'force-dynamic'

import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { SessionProvider } from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })


export const metadata: Metadata = {
  title: 'Kalos - Fitness App',
  description: 'sculpt your future',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}