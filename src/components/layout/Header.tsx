// src/components/layout/Header.tsx
"use client"

import Link from "next/link"
import { User } from "lucide-react"
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { isAuthenticated } = useAuth()
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F3F0] border-b border-[#E5E0DC]">
      <div className="max-w-[1400px] mx-auto px-4 py-3 sm:py-4 flex items-center justify-center">
        {/* KALOS logo */}
        <div className="flex justify-center items-center">
          <Link href="/dashboard" className="inline-block">
            <h1 
              className="text-3xl sm:text-4xl tracking-wide font-normal text-[#1A1A1A]"
              style={{ 
                fontFamily: "'Lucida Sans Typewriter', 'Courier New', monospace",
                fontWeight: 400,
                letterSpacing: '0.02em'
              }}
            >
              kalos
            </h1>
          </Link>
        </div>
      </div>
    </header>
  )
}