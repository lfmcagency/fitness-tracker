import { cn } from "@/lib/utils";
import React from "react";

interface FlexProps {
  children: React.ReactNode;
  direction?: "row" | "col";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
  wrap?: boolean;
  className?: string;
}

export const Flex = ({
    children,
    direction = "row",
    align = "start",
    justify = "start",
    gap = 4,
    wrap = false,
    className
  }: FlexProps) => {
    const getAlignClass = () => {
      switch (align) {
        case "start": return "items-start";
        case "center": return "items-center";
        case "end": return "items-end";
        default: return "items-start";
      }
    };
    
    const getJustifyClass = () => {
      switch (justify) {
        case "start": return "justify-start";
        case "center": return "justify-center";
        case "end": return "justify-end";
        case "between": return "justify-between";
        default: return "justify-start";
      }
    };
    
    const getGapClass = () => {
      return `gap-${gap}`;
    };
    
    return (
      <div className={cn(
        "flex w-full",
        direction === "col" && "flex-col",
        getAlignClass(),
        getJustifyClass(),
        getGapClass(),
        wrap && "flex-wrap",
        className
      )}>
        {children}
      </div>
    );
  }