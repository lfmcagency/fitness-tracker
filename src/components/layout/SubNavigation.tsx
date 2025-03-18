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
        
        {/* Greek Meander Pattern */}
        <div className="w-full overflow-hidden h-[24px]">
          <svg 
            width="100%" 
            height="24" 
            viewBox="0 0 1200 24" 
            preserveAspectRatio="xRepeat meet"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#1A1A1A]"
          >
            <defs>
              {/* Proper Greek Meander (Key) Pattern - Continuous Pattern */}
              <pattern 
                id="greekMeander" 
                x="0" 
                y="0" 
                width="120" 
                height="24" 
                patternUnits="userSpaceOnUse"
              >
                {/* Main horizontal line */}
                <path 
                  d="M0,8 H120" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none"
                />
                
                {/* Meander elements - Connected properly for continuous pattern */}
                <path 
                  d="M10,8 V16 H30 V8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M40,8 V16 H60 V8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M70,8 V16 H90 V8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M100,8 V16 H120 V8" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                
                {/* Vertical connecting lines - Optional, for more ornate version */}
                <path 
                  d="M10,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M30,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M40,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M60,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M70,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M90,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M100,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                <path 
                  d="M120,16 V24" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                
                {/* Bottom horizontal connecting line for complete pattern */}
                <path 
                  d="M0,24 H120" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  fill="none" 
                />
                
                {/* Optional - Small decorative elements */}
                <circle cx="20" cy="12" r="1" fill="currentColor" />
                <circle cx="50" cy="12" r="1" fill="currentColor" />
                <circle cx="80" cy="12" r="1" fill="currentColor" />
                <circle cx="110" cy="12" r="1" fill="currentColor" />
              </pattern>
            </defs>
            
            {/* Apply the pattern to a full-width rectangle */}
            <rect 
              x="0" 
              y="0" 
              width="100%" 
              height="24" 
              fill="url(#greekMeander)" 
            />
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