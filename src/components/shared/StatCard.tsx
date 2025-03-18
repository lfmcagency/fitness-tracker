import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, Minus } from 'lucide-react';
import { colors } from '@/lib/colors';

export interface StatCardProps {
  /** Title of the stat card */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Previous value for comparison (optional) */
  previousValue?: string | number;
  /** Unit to display after the value (optional) */
  unit?: string;
  /** Format to use for the change (percentage, absolute, custom) */
  changeFormat?: 'percentage' | 'absolute' | 'none';
  /** Whether higher is better (affects color of change indicator) */
  higherIsBetter?: boolean;
  /** Icon to display in the card (optional) */
  icon?: React.ReactNode;
  /** Visual style variant */
  variant?: 'default' | 'outline' | 'filled';
  /** Size of the card */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Callback for when card is clicked */
  onClick?: () => void;
}

/**
 * StatCard component for displaying key metrics and statistics
 */
export function StatCard({
  title,
  value,
  previousValue,
  unit = '',
  changeFormat = 'percentage',
  higherIsBetter = true,
  icon,
  variant = 'default',
  size = 'md',
  className,
  onClick,
}: StatCardProps) {
  // Calculate change if previous value is provided
  const hasChange = previousValue !== undefined && previousValue !== null;
  
  let changeValue: number | null = null;
  let changeString = '';
  let isPositive = false;
  
  if (hasChange) {
    const currentNumeric = typeof value === 'string' ? parseFloat(value) : value;
    const previousNumeric = typeof previousValue === 'string' ? parseFloat(previousValue) : previousValue;
    
    if (!isNaN(currentNumeric) && !isNaN(previousNumeric) && previousNumeric !== 0) {
      const absoluteChange = currentNumeric - previousNumeric;
      
      if (changeFormat === 'percentage') {
        changeValue = (absoluteChange / Math.abs(previousNumeric)) * 100;
        changeString = `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(1)}%`;
      } else if (changeFormat === 'absolute') {
        changeValue = absoluteChange;
        changeString = `${changeValue > 0 ? '+' : ''}${changeValue}${unit}`;
      }
      
      isPositive = changeValue !== null && changeValue > 0;
    }
  }

  // Determine if the change is good (green) or bad (red)
  const isChangePositive = higherIsBetter ? isPositive : !isPositive;
  const isChangeNeutral = changeValue === 0;
  
  // Determine size classes
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-5',
  };
  
  // Determine variant classes
  const variantClasses = {
    default: `bg-${colors.kalosBg} border border-${colors.kalosBorder}`,
    outline: `border border-${colors.kalosText} bg-transparent`,
    filled: `bg-${colors.kalosText} text-white`,
  };

  // Determine change indicator color
  const changeColors = {
    positive: colors.statusSuccess,
    negative: colors.statusDanger,
    neutral: colors.kalosMuted,
  };

  return (
    <div 
      className={cn(
        'rounded-md flex flex-col transition-all duration-200',
        sizeClasses[size],
        variantClasses[variant],
        onClick && 'cursor-pointer hover:shadow-sm',
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={cn('font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>{title}</h3>
        {icon && <div style={{ color: colors.kalosMuted }}>{icon}</div>}
      </div>
      
      <div className="flex items-baseline">
        <span className={cn('font-medium', {
          'text-lg': size === 'sm',
          'text-xl': size === 'md',
          'text-2xl': size === 'lg',
        })}>
          {value}
        </span>
        {unit && <span style={{ color: colors.kalosMuted }} className="ml-1 text-sm">{unit}</span>}
      </div>
      
      {hasChange && changeFormat !== 'none' && (
        <div className="flex items-center mt-2">
          {isChangePositive && !isChangeNeutral ? (
            <ArrowUpIcon 
              className={cn('w-3 h-3 mr-1')} 
              style={{ color: changeColors.positive }}
            />
          ) : isChangeNeutral ? (
            <Minus 
              className={cn('w-3 h-3 mr-1')} 
              style={{ color: changeColors.neutral }} 
            />
          ) : (
            <ArrowDownIcon 
              className={cn('w-3 h-3 mr-1')} 
              style={{ color: changeColors.negative }}
            />
          )}
          <span 
            className={cn('text-xs')}
            style={{ 
              color: isChangePositive && !isChangeNeutral ? changeColors.positive : 
                    isChangeNeutral ? changeColors.neutral : 
                    changeColors.negative 
            }}
          >
            {changeString}
          </span>
        </div>
      )}
    </div>
  );
}

export default StatCard;