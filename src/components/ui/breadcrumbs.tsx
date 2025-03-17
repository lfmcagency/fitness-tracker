import { cn } from "@/lib/utils";
import { ChevronRight, Link } from "lucide-react";
import React from "react";

interface BreadcrumbsProps {
  items: Array<{
    href: string;
    label: string;
  }>;
  className?: string;
}

export const Breadcrumbs = ({
    items,
    className
  }: BreadcrumbsProps) => (
    <nav className={cn("flex items-center space-x-2", className)}>
      {items.map((item, index) => (
        <React.Fragment key={item.href}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
          <Link
            href={item.href}
            className={cn(
              "text-sm",
              index === items.length - 1 
                ? "text-gray-900 font-medium" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {item.label}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  )