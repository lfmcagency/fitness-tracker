import { cn } from "@/lib/utils";
import React from "react";

interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
  className?: string;
}

export const Grid = ({
    children,
    cols = 1,
    gap = 4,
    className
  }: GridProps) => {
    const getColsClass = () => {
      switch (cols) {
        case 1: return "grid-cols-1";
        case 2: return "grid-cols-2";
        case 3: return "grid-cols-3";
        case 4: return "grid-cols-4";
        case 5: return "grid-cols-5";
        case 6: return "grid-cols-6";
        case 7: return "grid-cols-7";
        case 8: return "grid-cols-8";
        case 9: return "grid-cols-9";
        case 10: return "grid-cols-10";
        case 11: return "grid-cols-11";
        case 12: return "grid-cols-12";
        default: return "grid-cols-1";
      }
    };
    
    const getGapClass = () => {
      return `gap-${gap}`;
    };
    
    return (
      <div className={cn(
        "grid w-full",
        getColsClass(),
        getGapClass(),
        className
      )}>
        {children}
      </div>
    );
  }