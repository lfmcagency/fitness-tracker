"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Salad, ListChecks, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/colors'
// Import the custom icons
import { 
  SisyphusIcon,
  PhiIcon,
  SomaIcon3
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
      href: "/dashboard",
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-kalos-bg border-t border-kalos-border">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-2">
        {/* Quick Add Button (Left Corner) with custom icon */}
        <button
          onClick={onQuickAddClick}
          className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-kalos-text text-white transition-transform hover:scale-105 shadow-lg"
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
                  ? "text-[#7392B7]" 
                  : "text-kalos-text hover:text-kalos-dark hover:bg-kalos-highlight/50"
              )}
              aria-label={item.label}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-body">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}