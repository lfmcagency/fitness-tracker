import { cn } from "@/lib/utils";

interface FlexProps {
  children: React.ReactNode;
  direction?: "row" | "col";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
  gap?: number;
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
  }: FlexProps) => (
    <div className={cn(
      "flex",
      direction === "col" && "flex-col",
      `items-${align}`,
      `justify-${justify}`,
      `gap-${gap}`,
      wrap && "flex-wrap",
      className
    )}>
      {children}
    </div>
  )