import { cn } from "@/lib/utils";

interface GridProps {
  children: React.ReactNode;
  cols?: number;
  gap?: number;
  className?: string;
}

export const Grid = ({
    children,
    cols = 1,
    gap = 4,
    className
  }: GridProps) => (
    <div className={cn(
      "grid",
      `grid-cols-${cols}`,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  )