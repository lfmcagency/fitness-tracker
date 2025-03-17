import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

// src/components/ui/layout.tsx
interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export const Container = ({ 
    children, 
    maxWidth = "2xl", 
    className 
  }: ContainerProps) => (
    <div className={cn(
      "w-full mx-auto px-4",
      maxWidth === "sm" && "max-w-screen-sm",
      maxWidth === "md" && "max-w-screen-md",
      maxWidth === "lg" && "max-w-screen-lg",
      maxWidth === "xl" && "max-w-screen-xl",
      maxWidth === "2xl" && "max-w-screen-2xl",
      className
    )}>
      {children}
    </div>
  )
  
  interface SectionProps {
    children: React.ReactNode;
    collapsible?: boolean;
    title?: string;
    className?: string;
    background?: string;
  }
  
  export const Section = ({
      children,
      collapsible,
      title,
      className,
      background
    }: SectionProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    return (
      <section className={cn(
        "py-6",
        background && `bg-${background}`,
        className
      )}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{title}</h2>
            {collapsible && (
              <button onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? <ChevronDown /> : <ChevronUp />}
              </button>
            )}
          </div>
        )}
        {!isCollapsed && children}
      </section>
    )
  }