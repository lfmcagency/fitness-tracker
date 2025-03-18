// src/components/layout/SubNavigation.tsx
"use client"

import React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { colors } from '@/lib/colors'

interface BreadcrumbItem {
  href: string;
  label: string;
}

interface SubNavigationProps {
  breadcrumbs: BreadcrumbItem[];
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export default function SubNavigation({
  breadcrumbs,
  showBackButton = false,
  onBackClick
}: SubNavigationProps) {
  return (
    <div className="fixed top-[60px] left-0 right-0 z-40 w-full bg-kalos-bg border-b border-kalos-border">
      <div className="max-w-[1400px] mx-auto">
        {/* Simple divider line instead of meander pattern */}
        <div className="h-[2px] w-full bg-kalos-text"></div>
        
        {/* Breadcrumbs */}
        <div className="px-4">
          <div className="flex items-center h-9">
            {/* Back Button */}
            {showBackButton && (
              <button 
                onClick={onBackClick}
                className="p-1 mr-1.5 hover:bg-kalos-highlight rounded-full transition-colors flex-shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            
            {/* Breadcrumbs */}
            <nav className="overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
              <ol className="flex items-center">
                {/* Home icon for first crumb if it's dashboard */}
                {breadcrumbs.length > 0 && breadcrumbs[0].href === '/dashboard' && (
                  <li className="flex items-center">
                    <Link 
                      href="/dashboard" 
                      className="text-kalos-muted hover:text-kalos-text transition-colors flex-shrink-0"
                      aria-label="Home"
                    >
                      <Home className="w-3 h-3" />
                    </Link>
                  </li>
                )}
                
                {/* Other breadcrumbs */}
                {breadcrumbs.map((crumb, index) => {
                  // Skip the first crumb if it's dashboard (already shown as home icon)
                  if (index === 0 && crumb.href === '/dashboard') return null;
                  
                  return (
                    <li key={crumb.href} className="flex items-center min-w-0">
                      <ChevronRight className="mx-1 w-2.5 h-2.5 text-kalos-muted flex-shrink-0" />
                      <Link
                        href={crumb.href}
                        className={cn(
                          "text-[11px] whitespace-nowrap overflow-hidden text-ellipsis max-w-xs",
                          index === breadcrumbs.length - 1
                            ? "font-medium text-kalos-text"
                            : "text-kalos-muted hover:text-kalos-text transition-colors"
                        )}
                      >
                        {crumb.label}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

// Scrollbar hiding CSS
const scrollbarStyle = `
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Add style to document if in browser environment
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = scrollbarStyle;
  document.head.appendChild(style);
}