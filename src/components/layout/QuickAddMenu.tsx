// src/components/layout/QuickAddMenu.tsx
"use client"

import { X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from '@/hooks/useAuth'
import { SisyphusIcon } from '../icons/CustomIcons'

interface QuickAddMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function QuickAddMenu({ isOpen, onClose }: QuickAddMenuProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  const handleNavigate = (path: string) => {
    if (!isAuthenticated) {
      router.push('/auth/signin')
      onClose()
      return
    }
    
    router.push(path)
    onClose()
  }
  
  // Main navigation domains
  const mainDomains = [
    {
      name: "Arete",
      description: "progress & goals",
      path: "/progress",
      symbol: "Α" // Alpha
    },
    {
      name: "Trophe",
      description: "macro tracking",
      path: "/nutrition",
      symbol: "Τ" // Tau
    },
    {
      name: "Ethos",
      description: "routines & habits",
      path: "/routine",
      symbol: "Η" // Eta
    },
    {
      name: "Soma",
      description: "physical training",
      path: "/training",
      symbol: "Σ" // Sigma
    }
  ]
  
  // Quick add actions
  const quickActions = [
    {
      name: "Weight",
      path: "/progress/add-weight",
      color: "bg-[#F2EFE9]"
    },
    {
      name: "Food",
      path: "/nutrition/add-meal",
      color: "bg-[#F2EFE9]"
    },
    {
      name: "Task",
      path: "/routine/add-task",
      color: "bg-[#F2EFE9]"
    },
    {
      name: "Workout",
      path: "/training/create",
      color: "bg-[#F2EFE9]"
    }
  ]
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 bg-[#F7F3F0] flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-[#E5E0DC] rounded-full transition-colors z-10"
            aria-label="Close menu"
          >
            <X className="w-8 h-8 text-[#1A1A1A]" />
          </button>
          
          {/* Menu container */}
          <div className="max-w-[1400px] mx-auto w-full h-full px-6 flex flex-col">
            {/* Menu heading */}
            <h2 className="font-light text-2xl mt-16 mb-4 text-center tracking-wide"
              style={{ fontFamily: "'Lucida Sans Typewriter', 'Courier New', monospace" }}>
              kalos
            </h2>
            
            {/* Main domains - centered menu */}
            <div className="flex-1 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-6 sm:gap-8 max-w-md">
                {mainDomains.map((domain) => (
                  <button 
                    key={domain.name}
                    onClick={() => handleNavigate(domain.path)}
                    className="group flex flex-col items-center text-center p-5 sm:p-6 border border-[#E5E0DC] rounded-lg hover:bg-[#E5E0DC]/30 transition-colors"
                  >
                    <span className="text-3xl font-light mb-3 text-[#1A1A1A] group-hover:scale-110 transition-transform">
                      {domain.symbol}
                    </span>
                    <span className="text-lg font-medium text-[#1A1A1A]">
                      {domain.name}
                    </span>
                    <span className="text-sm text-[#6B6B6B] mt-1">
                      {domain.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Quick actions - bottom bar */}
            <div className="border-t border-[#E5E0DC] py-6">
              <h3 className="text-sm font-medium text-[#6B6B6B] mb-4 text-center">Quick Add</h3>
              <div className="flex justify-center space-x-4">
                {quickActions.map((action) => (
                  <button 
                    key={action.name}
                    onClick={() => handleNavigate(action.path)}
                    className="group flex flex-col items-center"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center border border-[#E5E0DC] group-hover:border-[#1A1A1A] transition-colors`}>
                      <Plus className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                    <span className="text-xs mt-2 text-[#1A1A1A]">{action.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}