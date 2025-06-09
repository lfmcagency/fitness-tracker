import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export interface ProgressRingProps {
  /** Progress value (0-100) */
  value: number;
  /** Size of the ring in pixels */
  size: number;
  /** Stroke thickness */
  thickness?: number;
  /** Color of the progress arc */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Whether to show percentage text */
  showPercentage?: boolean;
  /** Custom label to display in center */
  label?: React.ReactNode | string;
  /** Label text size */
  labelSize?: 'xs' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function ProgressRing({ 
  value, 
  size, 
  thickness = 4,
  color = colors.statusPrimary,
  trackColor = colors.kalosBorder,
  showPercentage = false,
  label,
  labelSize = 'md',
  className 
}: ProgressRingProps) {
  const radius = (size - thickness * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(value / 100) * circumference} ${circumference}`;
  
  // Label size classes
  const labelSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm', 
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="transparent"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      
      {/* Center label */}
      {(label || showPercentage) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn('text-center', labelSizeClasses[labelSize])}>
            {label ? (
              typeof label === 'string' ? (
                <span className="font-medium">{label}</span>
              ) : (
                label
              )
            ) : showPercentage ? (
              <span className="font-medium">{Math.round(value)}%</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressRing;