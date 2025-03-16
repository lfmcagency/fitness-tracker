"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart2, Apple, Plus, Dumbbell, User } from "lucide-react"

interface BottomNavigationProps {
  onQuickAddClick: () => void
}

export default function BottomNavigation({ onQuickAddClick }: BottomNavigationProps) {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F7F3F0] border-t border-[#E5E0DC]">
      <div className="max-w-screen-sm mx-auto grid grid-cols-5 items-center">
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center justify-center py-3 ${
            isActive("/dashboard") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <BarChart2 className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/nutrition" 
          className={`flex flex-col items-center justify-center py-3 ${
            isActive("/nutrition") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <Apple className="w-6 h-6" />
        </Link>
        
        <button
          onClick={onQuickAddClick}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A1A] text-white -mt-5"
        >
          <Plus className="w-6 h-6" />
        </button>
        
        <Link 
          href="/training" 
          className={`flex flex-col items-center justify-center py-3 ${
            isActive("/training") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <Dumbbell className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/profile" 
          className={`flex flex-col items-center justify-center py-3 ${
            isActive("/profile") ? "text-[#1A1A1A]" : "text-[#6B6B6B]"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden">
            <User className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>
    </nav>
  )
}