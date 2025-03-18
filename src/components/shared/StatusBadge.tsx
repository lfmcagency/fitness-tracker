import React from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, XIcon, AlertTriangleIcon, ClockIcon, ActivityIcon } from 'lucide-react';

export type StatusType = 'success' | 'error' | 'warning' | 'pending' | 'neutral' | 'active';

export interface StatusBadgeProps {
  /** The status to display */
  status: StatusType;
  /** Text to display alongside the status icon */
  text?: string;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Variant style (filled, outline, minimal) */
  variant?: 'filled' | 'outline' | 'minimal';
  /** Show only the icon without text */
  iconOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the status should pulse (for active/pending states) */
  pulse?: boolean;
}

/**
 * StatusBadge component for displaying status indicators
 */
export function StatusBadge({
  status,
  text,
  showIcon = true,
  size = 'md',
  variant = 'filled',
  iconOnly = false,
  className,
  pulse = false,
}: StatusBadgeProps) {
  // Define status colors
  const statusConfig = {
    success: {
      color: '#7D8F69',
      icon: CheckIcon,
      defaultText: 'Success',
    },
    error: {
      color: '#B85C38',
      icon: XIcon,
      defaultText: 'Error',
    },
    warning: {
      color: '#A4907C',
      icon: AlertTriangleIcon,
      defaultText: 'Warning',
    },
    pending: {
      color: '#6B6B6B',
      icon: ClockIcon,
      defaultText: 'Pending',
    },
    neutral: {
      color: '#6B6B6B',
      icon: null,
      defaultText: 'Neutral',
    },
    active: {
      color: '#1A1A1A',
      icon: ActivityIcon,
      defaultText: 'Active',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const displayText = text || config.defaultText;

  // Determine size classes
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Determine variant classes
  let variantStyle = {};
  if (variant === 'filled') {
    variantStyle = {
      background: config.color,
      color: 'white',
    };
  } else if (variant === 'outline') {
    variantStyle = {
      background: 'transparent',
      color: config.color,
      border: `1px solid ${config.color}`,
    };
  } else if (variant === 'minimal') {
    variantStyle = {
      background: 'transparent',
      color: config.color,
    };
  }

  // For icon-only version
  if (iconOnly) {
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          pulse && 'animate-pulse',
          {
            'w-6 h-6': size === 'sm',
            'w-8 h-8': size === 'md',
            'w-10 h-10': size === 'lg',
          },
          className
        )}
        style={variantStyle}
      >
        {StatusIcon && (
          <StatusIcon className={iconSizes[size]} />
        )}
      </span>
    );
  }

  return (
    <span 
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
      style={variantStyle}
    >
      {showIcon && StatusIcon && (
        <StatusIcon className={cn(iconSizes[size], 'mr-1.5')} />
      )}
      <span>{displayText}</span>
    </span>
  );
}

export default StatusBadge;