'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard on home page
    router.push('/dashboard')
  }, [router])

  return null
}
