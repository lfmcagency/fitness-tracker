import './globals.css'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/Navigation'
import { SessionProvider } from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Fitness Tracker',
  description: 'Track your fitness journey',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white`}>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center">
                      <span className="text-xl font-bold">FitnessTracker</span>
                    </div>
                    <Navigation />
                  </div>
                </div>
              </div>
            </nav>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}