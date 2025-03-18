"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Salad, ListChecks, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from '@/hooks/useAuth'
// Import the custom icons
import { 
  SisyphusIcon,
  PhiMenuIcon,
  SomaIcon3, PhiIcon,
  StylisedPhiIcon,
  SimplePhiIcon,
} from '../icons/CustomIcons'

interface BottomNavigationProps {
  onQuickAddClick: () => void
}

export default function BottomNavigation({ onQuickAddClick }: BottomNavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  
  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  }

  const navItems = [
    {
      href: "/progress",
      label: "Arete",
      icon: <SisyphusIcon />, // Using the Sisyphus icon for Arete/Progress
      active: isActive("/progress")
    },
    {
      href: "/nutrition",
      label: "Trophe",
      icon: <Salad className="w-6 h-6" />,
      active: isActive("/nutrition")
    },
    {
      href: "/routine",
      label: "Ethos",
      icon: <ListChecks className="w-6 h-6" />,
      active: isActive("/routine")
    },
    {
      href: "/training",
      label: "Soma",
      icon: <SomaIcon3 />, // Using the Greek Athlete icon for Soma/Body
      active: isActive("/training")
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <UserCircle className="w-6 h-6" />,
      active: isActive("/profile")
    }
  ]
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#F7F3F0] border-t border-[#E5E0DC]">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-2">
        {/* Quick Add Button (Left Corner) with custom icon */}
        <button
          onClick={onQuickAddClick}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1A1A1A] text-white transition-transform hover:scale-105 shadow-lg"
          aria-label="Quick add menu"
        >
          <PhiIcon />
        </button>
        
        {/* Navigation Icons */}
        <div className="flex-1 grid grid-cols-5 gap-1 pl-4">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors",
                item.active 
                  ? "text-[#1A1A1A]" 
                  : "text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#E5E0DC]/50"
              )}
              aria-label={item.label}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-medium">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}