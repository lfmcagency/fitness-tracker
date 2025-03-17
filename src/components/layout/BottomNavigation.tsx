"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart3, Apple, Plus, ClipboardCheck, Dumbbell } from "lucide-react"
import { useAuth } from '@/hooks/useAuth'

interface BottomNavigationProps {
  onQuickAddClick: () => void
}

export default function BottomNavigation({ onQuickAddClick }: BottomNavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F7F3F0] border-t border-[#E5E0DC]">
      <div className="max-w-screen-sm mx-auto flex items-center justify-around">
        <Link 
          href="/dashboard" 
          className={`flex items-center justify-center py-4 px-3 ${
            isActive("/dashboard") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <BarChart3 className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/nutrition" 
          className={`flex items-center justify-center py-4 px-3 ${
            isActive("/nutrition") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <Apple className="w-6 h-6" />
        </Link>
        
        <button
          onClick={onQuickAddClick}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1A1A1A] text-white -mt-6"
        >
          <Plus className="w-8 h-8" />
        </button>
        
        <Link 
          href="/routine" 
          className={`flex items-center justify-center py-4 px-3 ${
            isActive("/routine") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <ClipboardCheck className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/training" 
          className={`flex items-center justify-center py-4 px-3 ${
            isActive("/training") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <Dumbbell className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  )
}