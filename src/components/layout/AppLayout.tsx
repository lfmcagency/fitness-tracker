// src/components/layout/AppLayout.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Header from "./Header"
import BottomNavigation from "./BottomNavigation"
import QuickAddMenu from "./QuickAddMenu"
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/lib/colors'

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  requireAuth?: boolean;
}

export default function AppLayout({ 
  children, 
  title,
  requireAuth = true
}: AppLayoutProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && requireAuth) {
      router.push('/auth/signin')
    }
  }, [isAuthenticated, isLoading, requireAuth, router])
  
  const handleQuickAddToggle = () => {
    setQuickAddOpen(!quickAddOpen)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-kalos-bg">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-24 bg-kalos-border rounded mb-4"></div>
          <div className="h-4 w-16 bg-kalos-border rounded"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && requireAuth) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-kalos-bg text-kalos-text max-w-[1400px] mx-auto">
      {/* Fixed elements */}
      <Header />
      
      {/* Main content - with proper spacing for fixed header */}
      <main className="flex-1 mt-[70px] pb-24 px-4 sm:px-6 md:px-8">
        <div className="max-w-screen-xl mx-auto">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-heading mb-6 mt-4">{title}</h1>
          )}
          {children}
        </div>
      </main>
      
      <BottomNavigation onQuickAddClick={handleQuickAddToggle} />
      
      <QuickAddMenu 
        isOpen={quickAddOpen} 
        onClose={() => setQuickAddOpen(false)} 
      />
    </div>
  )
}