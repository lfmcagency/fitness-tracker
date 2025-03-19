import { lucidaSans, lucidaTypewriter } from '@/lib/fonts'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${lucidaSans.variable} ${lucidaTypewriter.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}