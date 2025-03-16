'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { status } = useSession()
  
  // Only redirect authenticated users to dashboard
  if (status === 'authenticated') {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F3F0] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-light tracking-wide text-[#1A1A1A] mb-3">
            <span className="block">Welcome to</span>
            <span className="block font-medium">Kalos</span>
          </h1>
          <p className="mt-3 text-lg text-[#6B6B6B] mb-8">
            Track your fitness journey with a holistic approach to training, nutrition, and daily routines.
          </p>
          <div className="flex flex-col space-y-3">
            <Link
              href="/auth/signin"
              className="w-full py-3 bg-[#1A1A1A] text-white rounded-md font-medium transition-colors hover:bg-[#333333]"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="w-full py-3 border border-[#1A1A1A] text-[#1A1A1A] rounded-md font-medium transition-colors hover:bg-[#E5E0DC]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}