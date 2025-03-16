// src/components/layout/AppLayout.tsx
"use client"

import { useState } from "react"
import Header from "./Header"
import BottomNavigation from "./BottomNavigation"
import QuickAddMenu from "./QuickAddMenu"

interface AppLayoutProps {
  children: React.ReactNode
  title: string;
  showBackButton?: boolean
  onBackClick?: () => void
}

export default function AppLayout({ 
  children, 
  showBackButton = false,
  onBackClick
}: AppLayoutProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  
  const handleQuickAddToggle = () => {
    setQuickAddOpen(!quickAddOpen)
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