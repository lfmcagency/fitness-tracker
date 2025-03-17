// src/components/layout/QuickAddMenu.tsx
"use client"

import { X, Dumbbell, Apple, ClipboardCheck, BarChart3, BookOpen, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from '@/hooks/useAuth'

interface QuickAddMenuProps {
  isOpen: boolean
  onClose: () => void
}

interface QuickOption {
  icon: React.ReactNode
  title: string
  description: string
  path: string
  primary?: boolean
}

export default function QuickAddMenu({ isOpen, onClose }: QuickAddMenuProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  const handleOption = (path: string) => {
    if (!isAuthenticated) {
      router.push('/auth/signin')
      onClose()
      return
    }
    
    router.push(path)
    onClose()
  }
  
  // Primary quick actions (shown prominently)
  const primaryOptions: QuickOption[] = [
    {
      icon: <Dumbbell className="w-10 h-10" />,
      title: "Create Workout",
      description: "Start a new training session",
      path: "/training/create",
      primary: true
    },
    {
      icon: <Apple className="w-10 h-10" />,
      title: "Log Meal",
      description: "Record your nutrition",
      path: "/nutrition/add-meal",
      primary: true
    },
    {
      icon: <ClipboardCheck className="w-10 h-10" />,
      title: "Add Task",
      description: "Create a new task or habit",
      path: "/routine/add-task",
      primary: true
    }
  ]
  
  // Secondary navigation options (can be expanded later)
  const secondaryOptions: QuickOption[] = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Dashboard",
      description: "View your progress",
      path: "/dashboard"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Skill Tree",
      description: "Explore exercise progressions",
      path: "/skill-tree"
    },
    {
      icon: <User className="w-6 h-6" />,
      title: "Profile",
      description: "View your account",
      path: "/profile"
    }
  ]
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 bg-[#F7F3F0] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2"
          >
            <X className="w-8 h-8 text-[#1A1A1A]" />
          </button>
          
          {/* Primary actions */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 px-6 pt-16">
            {primaryOptions.map((option, index) => (
              <button 
                key={index}
                onClick={() => handleOption(option.path)}
                className="w-full flex items-center justify-center flex-col"
              >
                <div className="w-20 h-20 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mb-4">
                  {option.icon}
                </div>
                <h3 className="text-lg font-medium">{option.title}</h3>
                <p className="text-[#6B6B6B] mt-1">{option.description}</p>
              </button>
            ))}
          </div>
          
          {/* Secondary navigation (hidden for now, can be enabled when needed) */}
          {/* <div className="px-6 py-8 border-t border-[#E5E0DC]">
            <div className="grid grid-cols-3 gap-4">
              {secondaryOptions.map((option, index) => (
                <button 
                  key={index}
                  onClick={() => handleOption(option.path)}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#E5E0DC] text-[#1A1A1A] flex items-center justify-center mb-2">
                    {option.icon}
                  </div>
                  <span className="text-sm font-medium">{option.title}</span>
                </button>
              ))}
            </div>
          </div> */}
        </motion.div>
      )}
    </AnimatePresence>
  )
}