import { cn } from "@/lib/utils";

interface TabGroupProps {
  tabs: Array<{
    id: string;
    label: string;
    badge?: string | number;
  }>;
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export const TabGroup = ({
    tabs,
    activeTab,
    onChange,
    variant = "horizontal",
    className
  }: TabGroupProps) => (
    <div className={cn(
      "flex",
      variant === "vertical" && "flex-col",
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2",
            activeTab === tab.id && "bg-primary text-white",
            variant === "vertical" && "w-full"
          )}
        >
          {tab.label}
          {tab.badge && (
            <span className="ml-2 bg-secondary rounded-full px-2 py-0.5 text-xs">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )