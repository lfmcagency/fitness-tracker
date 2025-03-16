"use client"

import { useState } from "react"
import Header from "@/components/layout/Header"
import BottomNavigation from "@/components/layout/BottomNavigation"
import QuickAddMenu from "@/components/layout/QuickAddMenu"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AppLayout({ children, title = "Kalos" }: AppLayoutProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  
  const handleQuickAddToggle = () => {
    setQuickAddOpen(!quickAddOpen)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A]">
      <Header title={title} />
      
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