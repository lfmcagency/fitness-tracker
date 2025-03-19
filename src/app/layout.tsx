// src/app/layout.tsx
import { lucidaSans, lucidaTypewriter } from '@/lib/fonts'
import AuthProvider from '@/components/auth/AuthProvider'
import SessionProvider from '@/components/SessionProvider'
import './globals.css'

export const metadata = {
  title: 'Kalos - Fitness Tracker',
  description: 'Track your fitness journey with Kalos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${lucidaSans.variable} ${lucidaTypewriter.variable}`}>
      <body>
        <SessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  )
}