// src/components/layout/AppLayout.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Header from "./Header"
import SubNavigation from "./SubNavigation"
import BottomNavigation from "./BottomNavigation"
import QuickAddMenu from "./QuickAddMenu"
import { useAuth } from '@/hooks/useAuth'

interface BreadcrumbItem {
  href: string;
  label: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  onBackClick?: () => void;
  requireAuth?: boolean;
}

export default function AppLayout({ 
  children, 
  title,
  showBackButton = false,
  breadcrumbs = [],
  onBackClick,
  requireAuth = true
}: AppLayoutProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // Auto-generate breadcrumbs if not provided
  const activeBreadcrumbs = breadcrumbs.length > 0 
    ? breadcrumbs 
    : generateBreadcrumbs(pathname || '');
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated && requireAuth) {
      router.push('/auth/signin')
    }
  }, [isAuthenticated, isLoading, requireAuth, router])
  
  const handleQuickAddToggle = () => {
    setQuickAddOpen(!quickAddOpen)
  }

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F3F0]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-24 bg-[#E5E0DC] rounded mb-4"></div>
          <div className="h-4 w-16 bg-[#E5E0DC] rounded"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && requireAuth) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A] max-w-[1400px] mx-auto">
      <Header />
      
      <SubNavigation 
        breadcrumbs={activeBreadcrumbs}
        showBackButton={showBackButton}
        onBackClick={handleBackClick}
      />
      
      {/* Main content */}
      <main className="flex-1 pb-24 px-4 sm:px-6 md:px-8">
        <div className="max-w-screen-xl mx-auto">
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

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/') return [];
  
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  // Add Home breadcrumb if not on dashboard
  if (paths[0] !== 'dashboard') {
    breadcrumbs.push({
      href: '/dashboard',
      label: 'Home'
    });
  } else {
    // Still add dashboard but with the dashboard label
    breadcrumbs.push({
      href: '/dashboard',
      label: 'Dashboard'
    });
  }
  
  // Build the rest of the breadcrumbs
  let currentPath = '';
  paths.forEach((path, i) => {
    // Skip duplicating dashboard in breadcrumbs
    if (i === 0 && path === 'dashboard') return;
    
    currentPath += `/${path}`;
    
    // Format the label (capitalize first letter, replace hyphens with spaces)
    const label = path
      .replace(/-/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
    
    breadcrumbs.push({
      href: currentPath,
      label
    });
  });
  
  return breadcrumbs;
}