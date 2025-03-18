import React, { JSX } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StreakIndicatorProps {
  /** Current streak count */
  count: number;
  /** Max streak to show (for comparison) */
  maxStreak?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual style variant */
  variant?: 'default' | 'minimal' | 'badge';
  /** Whether to show the flames */
  showFlames?: boolean;
  /** Color intensity based on streak length */
  dynamicColor?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StreakIndicator component for displaying streaks with flame icon
 */
export function StreakIndicator({
  count,
  maxStreak,
  size = 'md',
  variant = 'default',
  showFlames = true,
  dynamicColor = true,
  className,
}: StreakIndicatorProps) {
  // Determine size classes
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Determine variant classes
  const variantClasses = {
    default: 'flex items-center',
    minimal: 'flex items-center text-[#6B6B6B]',
    badge: 'flex items-center bg-[#F7F3F0] border border-[#E5E0DC] rounded-full px-2 py-0.5',
  };

  // Determine flame color based on streak length
  const getFlameColor = () => {
    if (!dynamicColor) return '#B85C38';

    // Colors transition from orange to red as the streak gets longer
    if (count < 3) return '#B85C38'; // Base orange
    if (count < 7) return '#A74A2A'; // Darker orange
    if (count < 14) return '#963B1D'; // Deep orange
    if (count < 30) return '#852C10'; // Very dark orange
    return '#731D03'; // Almost red
  };

  // Calculate the number of flames to display based on streak length
  const getFlameCount = () => {
    if (count < 3) return 1;
    if (count < 7) return 2;
    if (count < 14) return 3;
    if (count < 30) return 4;
    return 5;
  };

  return (
    <div className={cn(variantClasses[variant], sizeClasses[size], className)}>
      {showFlames && (
        <div className="flex items-center mr-1">
          {Array.from({ length: Math.min(getFlameCount(), 3) }).map((_, index) => (
            <Flame 
              key={index} 
              className={cn(
                iconSizes[size], 
                index > 0 && '-ml-1',
                index === 0 && 'animate-pulse'
              )} 
              style={{ color: getFlameColor() }} 
            />
          ))}
        </div>
      )}
      
      <span className={cn(count >= 7 && 'font-medium')}>{count}</span>
      
      {maxStreak !== undefined && maxStreak > 0 && (
        <span className="text-[#6B6B6B] ml-1">
          {/* Show record for impressive streaks */}
          {count >= 7 && count === maxStreak && '(Record!)'}
          {/* Show max for comparison if not at max */}
          {count < maxStreak && `/ ${maxStreak}`}
        </span>
      )}
    </div>
  );
}

export default StreakIndicator;