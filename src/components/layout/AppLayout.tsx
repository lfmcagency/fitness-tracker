// src/components/layout/AppLayout.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "./Header"
import BottomNavigation from "./BottomNavigation"
import QuickAddMenu from "./QuickAddMenu"
import { useAuth } from '@/hooks/useAuth'

interface AppLayoutProps {
  children: React.ReactNode
  title: string;
  showBackButton?: boolean
  onBackClick?: () => void
  requireAuth?: boolean
}

export default function AppLayout({ 
  children, 
  showBackButton = false,
  onBackClick,
  requireAuth = true
}: AppLayoutProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && requireAuth) {
      router.push('/auth/signin')
    }
  }, [isAuthenticated, isLoading, requireAuth, router])
  
  const handleQuickAddToggle = () => {
    setQuickAddOpen(!quickAddOpen)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isAuthenticated && requireAuth) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A]">
      <Header 
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      />
      
      <main className="flex-1 pt-20 pb-20 overflow-auto">
        {children}
      </main>
      
      <BottomNavigation onQuickAddClick={handleQuickAddToggle} />
      
      <QuickAddMenu 
        isOpen={quickAddOpen} 
        onClose={() => setQuickAddOpen(false)} 
      />
    </div>
  )
}