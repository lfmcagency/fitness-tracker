export const dynamic = 'force-dynamic'

import './globals.css'
import type { Metadata } from 'next'
import { SessionProvider } from '@/components/SessionProvider'
import localFont from 'next/font/local'

// Define local fonts
const lucidaTypewriter = localFont({
  src: [
    {
      path: '/fonts/lucida/LTYPE.TTF', // Absolute path
      weight: '400',
      style: 'normal',
    },
    {
      path: '/fonts/lucida/LTYPEB.TTF', // Absolute path
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-heading',
  display: 'swap',
})

const lucidaConsole = localFont({
  src: '/fonts/lucida/lucon.ttf', // Absolute path
  variable: '--font-body',
  display: 'swap',
})

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
    <html lang="en" className={`${lucidaTypewriter.variable} ${lucidaConsole.variable}`}>
      <body className="font-body">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}