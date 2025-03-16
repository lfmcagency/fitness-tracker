import './globals.css'
import { Inter } from 'next/font/google'
import { SessionProvider } from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Kalos - Fitness Tracker',
  description: 'Track your fitness journey with a holistic approach',
}

// Explicitly mark as dynamic to avoid build-time auth issues
export const dynamic = 'force-dynamic'

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