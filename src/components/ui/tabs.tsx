import { cn } from "@/lib/utils";

interface TabGroupProps {
  tabs: Array<{
    id: string;
    label: string;
    badge?: string | number;
  }>;
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'horizontal' | 'vertical' | 'pills';
  className?: string;
  fullWidth?: boolean;
}

export const TabGroup = ({
    tabs,
    activeTab,
    onChange,
    variant = "horizontal",
    className,
    fullWidth = false
  }: TabGroupProps) => (
    <div className={cn(
      "w-full",
      variant === "horizontal" && "flex overflow-x-auto scrollbar-none",
      variant === "vertical" && "flex flex-col",
      variant === "pills" && "flex flex-wrap gap-2",
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2 text-sm whitespace-nowrap transition-colors",
            variant === "horizontal" && "border-b-2 flex-shrink-0",
            variant === "horizontal" && activeTab === tab.id 
              ? "border-primary font-medium" 
              : "border-transparent hover:border-gray-200",
            variant === "vertical" && "text-left border-l-2",
            variant === "vertical" && activeTab === tab.id 
              ? "border-primary bg-gray-50 font-medium" 
              : "border-transparent hover:bg-gray-50",
            variant === "pills" && "rounded-full",
            variant === "pills" && activeTab === tab.id 
              ? "bg-primary text-white" 
              : "bg-gray-100 hover:bg-gray-200",
            fullWidth && variant === "horizontal" && "flex-1",
            fullWidth && variant === "vertical" && "w-full"
          )}
        >
          {tab.label}
          {tab.badge && (
            <span className={cn(
              "ml-2 rounded-full px-2 py-0.5 text-xs",
              activeTab === tab.id && variant !== "pills" 
                ? "bg-primary text-white" 
                : "bg-gray-200 text-gray-700"
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )