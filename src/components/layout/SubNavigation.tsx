// src/components/layout/SubNavigation.tsx
"use client"

import React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  href: string;
  label: string;
}

interface SubNavigationProps {
  breadcrumbs: BreadcrumbItem[];
  showBackButton?: boolean;
  onBackClick?: () => void;
  className?: string;
}

export default function SubNavigation({
  breadcrumbs,
  showBackButton = true,
  onBackClick,
  className
}: SubNavigationProps) {
  return (
    <div className={cn(
      "sticky top-[53px] z-40 w-full bg-[#F7F3F0]/95 backdrop-blur-sm px-4 pb-1 pt-3",
      className
    )}>
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumbs and back button */}
        <div className="flex items-center mb-4">
          {/* Back button */}
          {showBackButton && (
            <button 
              onClick={onBackClick}
              className="mr-4 p-2 hover:bg-[#E5E0DC] rounded-full transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="overflow-x-auto whitespace-nowrap scrollbar-none py-2">
              <ol className="flex items-center">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center">
                    {index > 0 && <ChevronRight className="mx-2 w-4 h-4 text-[#6B6B6B]" />}
                    <Link
                      href={crumb.href}
                      className={cn(
                        "text-sm py-1 px-1",
                        index === breadcrumbs.length - 1
                          ? "font-medium text-[#1A1A1A]"
                          : "text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
                      )}
                    >
                      {crumb.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
        
        {/* Combined Greek Pattern - Using text color */}
        <div className="w-full overflow-hidden">
          <svg 
            width="100%" 
            height="34" 
            viewBox="0 0 1000 34" 
            fill="none" 
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#1A1A1A]"
          >
            <defs>
              {/* Greek Key Pattern from version 2 - Enhanced for clarity */}
              <pattern id="enhancedGreekKey" x="0" y="0" width="60" height="16" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="10" height="3" fill="currentColor" />
                <rect x="0" y="0" width="3" height="10" fill="currentColor" />
                <rect x="7" y="7" width="10" height="3" fill="currentColor" />
                <rect x="14" y="0" width="3" height="10" fill="currentColor" />
                <rect x="17" y="0" width="10" height="3" fill="currentColor" />
                <rect x="24" y="0" width="3" height="10" fill="currentColor" />
                <rect x="24" y="7" width="10" height="3" fill="currentColor" />
                <rect x="31" y="0" width="3" height="10" fill="currentColor" />
                <rect x="34" y="0" width="10" height="3" fill="currentColor" />
                <rect x="41" y="0" width="3" height="10" fill="currentColor" />
                <rect x="41" y="7" width="10" height="3" fill="currentColor" />
                <rect x="48" y="0" width="3" height="10" fill="currentColor" />
                <rect x="51" y="0" width="9" height="3" fill="currentColor" />
              </pattern>
              
              {/* Egg-and-Dart Pattern from version 3 - Most detailed version */}
              <pattern id="detailedEggDart" x="0" y="0" width="60" height="18" patternUnits="userSpaceOnUse">
                {/* Background band */}
                <rect x="0" y="0" width="60" height="18" fill="currentColor" opacity="0.1" />
                
                {/* Eggs */}
                <ellipse cx="10" cy="9" rx="6" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <ellipse cx="30" cy="9" rx="6" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <ellipse cx="50" cy="9" rx="6" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" />
                
                {/* Darts/arrows between eggs */}
                <path 
                  d="M20 3L20 15L23 9L20 3Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.8"
                />
                <path 
                  d="M40 3L40 15L43 9L40 3Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.8"
                />
                <path 
                  d="M0 3L0 15L3 9L0 3Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.8"
                />
                <path 
                  d="M60 3L60 15L57 9L60 3Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.8"
                />
                
                {/* Borders */}
                <rect x="0" y="0" width="60" height="1" fill="currentColor" opacity="0.3" />
                <rect x="0" y="17" width="60" height="1" fill="currentColor" opacity="0.3" />
              </pattern>
            </defs>
            
            {/* Upper Greek Key Section - from version 2 */}
            <rect y="0" width="100%" height="16" fill="url(#enhancedGreekKey)" />
            
            {/* Lower Egg-and-Dart Section - from version 3 */}
            <rect y="16" width="100%" height="18" fill="url(#detailedEggDart)" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// Add custom CSS to hide scrollbar while maintaining functionality
const scrollbarStyle = `
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Add the style to the document if in browser environment
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = scrollbarStyle;
  document.head.appendChild(style);
}