// src/components/layout/Header.tsx
"use client"

import Link from "next/link"
import { User } from "lucide-react"

interface HeaderProps {
  showBackButton?: boolean
  onBackClick?: () => void
}

export default function Header({ showBackButton, onBackClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F3F0] border-b border-[#E5E0DC]">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left section */}
        <div className="w-10">
          {showBackButton && (
            <button onClick={onBackClick} className="p-1">
              {/* Back button icon would go here */}
            </button>
          )}
        </div>
        
        {/* Center - KALOS logo */}
        <div className="flex-1 flex justify-center items-center">
          <svg width="100" height="40" xmlns="http://www.w3.org/2000/svg" className="fill-current">
            <text x="50%" y="50%" fontFamily="Dubai, sans-serif" fontSize="24" fontWeight="bold" fill="currentColor" textAnchor="middle" dominantBaseline="middle">
              KALOS
            </text>
          </svg>
        </div>
        
        {/* Right - Profile icon */}
        <Link href="/profile" className="w-10 flex justify-end">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>
    </header>
  )
}