// src/components/layout/Header.tsx
"use client"

import Link from "next/link"
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { isAuthenticated } = useAuth()
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-kalos-bg border-b border-kalos-border">
      <div className="max-w-[1400px] mx-auto px-4 py-4 flex items-center justify-center">
        {/* KALOS logo */}
        <div className="flex justify-center items-center">
          <Link href="/dashboard" className="inline-block">
            <h1 className="text-3xl sm:text-4xl tracking-wide font-heading text-kalos-text">
              kalos
            </h1>
          </Link>
        </div>
      </div>
    </header>
  )
}