import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressRingProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Size of the ring in pixels */
  size?: number;
  /** Thickness of the ring stroke */
  thickness?: number;
  /** Variant/color scheme */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
  /** Whether to show the percentage in the center */
  showPercentage?: boolean;
  /** Custom label to display in the center */
  label?: React.ReactNode;
  /** Custom color (overrides variant) */
  color?: string;
  /** Background color for the track */
  trackColor?: string;
  /** Additional CSS classes */
  className?: string;
  /** Font size for the label */
  labelSize?: 'sm' | 'md' | 'lg';
}

/**
 * ProgressRing component for circular progress visualization
 */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  thickness = 4,
  variant = 'default',
  showPercentage = false,
  label,
  color,
  trackColor,
  className,
  labelSize = 'md',
}: ProgressRingProps) {
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayValue = Math.round(percentage);

  // Calculate SVG parameters
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Center of the circle
  const center = size / 2;

  // Determine color based on variant
  const variantColors = {
    default: '#1A1A1A',
    success: '#7D8F69',
    warning: '#A4907C',
    danger: '#B85C38',
    neutral: '#6B6B6B',
  };

  const progressColor = color || variantColors[variant];
  const ringTrackColor = trackColor || '#E5E0DC';
  
  // Determine label size
  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-medium',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringTrackColor}
          strokeWidth={thickness}
        />
        
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      {(showPercentage || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-center', labelSizeClasses[labelSize])}>
            {label || `${displayValue}%`}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressRing;