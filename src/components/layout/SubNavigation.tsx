// src/components/layout/SubNavigation.tsx
"use client"

import React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <>
      {/* Greek Meander Pattern - Full Width - Reduced Height */}
      <div className="fixed top-[53px] left-0 right-0 z-40 w-full h-[18px] bg-[#F7F3F0]">
        <div className="w-full h-full overflow-hidden max-w-none">
          <svg 
            width="100%" 
            height="18" 
            viewBox="0 0 1200 18" 
            preserveAspectRatio="xRepeat meet"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#1A1A1A] w-full"
          >
            <defs>
              <pattern 
                id="greekMeander" 
                x="0" 
                y="0" 
                width="120" 
                height="18" 
                patternUnits="userSpaceOnUse"
              >
                {/* Main horizontal line */}
                <path 
                  d="M0,6 H120" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none"
                />
                
                {/* Meander elements */}
                <path 
                  d="M10,6 V12 H30 V6" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M40,6 V12 H60 V6" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M70,6 V12 H90 V6" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M100,6 V12 H120 V6" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                
                {/* Vertical connecting lines */}
                <path 
                  d="M10,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M30,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M40,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M60,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M70,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M90,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M100,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                <path 
                  d="M120,12 V18" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                
                {/* Bottom horizontal line */}
                <path 
                  d="M0,18 H120" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  fill="none" 
                />
                
                {/* Decorative dots */}
                <circle cx="20" cy="9" r="0.8" fill="currentColor" />
                <circle cx="50" cy="9" r="0.8" fill="currentColor" />
                <circle cx="80" cy="9" r="0.8" fill="currentColor" />
                <circle cx="110" cy="9" r="0.8" fill="currentColor" />
              </pattern>
            </defs>
            
            {/* Apply pattern */}
            <rect x="0" y="0" width="100%" height="18" fill="url(#greekMeander)" />
          </svg>
        </div>
      </div>
      
      {/* Breadcrumbs - Sticky, More Compact */}
      <div className="fixed top-[71px] left-0 right-0 z-40 w-full bg-[#F7F3F0]/95 backdrop-blur-sm border-b border-[#E5E0DC]">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center h-8">
            {/* Back Button */}
            {showBackButton && (
              <button 
                onClick={onBackClick}
                className="p-1 mr-1.5 hover:bg-[#E5E0DC] rounded-full transition-colors flex-shrink-0"
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
                      className="text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors flex-shrink-0"
                      aria-label="Home"
                    >
                      <Home className="w-3 h-3" />
                    </Link>
                  </li>
                )}
                
                {/* Other breadcrumbs */}
                {breadcrumbs.map((crumb, index) => {
                  // Skip the first crumb if it's dashboard (already showed as home icon)
                  if (index === 0 && crumb.href === '/dashboard') return null;
                  
                  return (
                    <li key={crumb.href} className="flex items-center min-w-0">
                      <ChevronRight className="mx-1 w-2.5 h-2.5 text-[#6B6B6B] flex-shrink-0" />
                      <Link
                        href={crumb.href}
                        className={cn(
                          "text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-xs",
                          index === breadcrumbs.length - 1
                            ? "font-medium text-[#1A1A1A]"
                            : "text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
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
      
      {/* Spacer to account for fixed navigation */}
      <div className="h-[79px]"></div>
    </>
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