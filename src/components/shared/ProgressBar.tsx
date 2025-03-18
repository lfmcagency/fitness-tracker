import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Minimum value for calculations (defaults to 0) */
  min?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Colors to use for the progress bar */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
  /** Whether to show the percentage text */
  showPercentage?: boolean;
  /** Custom label to display instead of percentage */
  label?: string;
  /** Whether label should be positioned inside the bar (only applies to md and lg sizes) */
  labelInside?: boolean;
  /** Custom color (overrides variant - using tailwind classes) */
  color?: string;
  /** Background color for the progress track */
  trackColor?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProgressBar component for visualizing progress toward a goal
 */
export function ProgressBar({
  value,
  max = 100,
  min = 0,
  size = 'md',
  variant = 'default',
  showPercentage = false,
  label,
  labelInside = false,
  color,
  trackColor,
  className,
}: ProgressBarProps) {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const displayValue = Math.round(percentage);

  // Determine size class
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4',
  };

  // Determine color based on variant
  const variantColors = {
    default: colors.kalosText,
    success: colors.statusSuccess,
    warning: colors.statusWarning,
    danger: colors.statusDanger,
    neutral: colors.kalosMuted,
  };

  // Determine track color
  const defaultTrackColor = colors.kalosBorder;

  // Determine text classes
  const textSize = size === 'lg' ? 'text-xs' : 'text-xs';

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showPercentage && !labelInside && (
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm text-${colors.kalosMuted}`}>{label || 'Progress'}</span>
          <span className="text-sm font-medium">{displayValue}%</span>
        </div>
      )}

      <div className={cn('w-full rounded-full overflow-hidden')} style={{ backgroundColor: trackColor || defaultTrackColor }}>
        <div
          className={cn(
            'rounded-full transition-all duration-500 ease-in-out',
            sizeClasses[size]
          )}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color || variantColors[variant]
          }}
        >
          {labelInside && size !== 'sm' && (
            <span
              className={cn(
                'px-2 text-white whitespace-nowrap',
                textSize,
                percentage < 20 && 'sr-only'
              )}
            >
              {label || `${displayValue}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;