import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export interface DetailExpanderProps {
  /** The title shown in the header */
  title: React.ReactNode;
  /** Content to display when expanded */
  children: React.ReactNode;
  /** Optional description to show under the title */
  description?: React.ReactNode;
  /** Optional icon to display next to the title */
  icon?: React.ReactNode;
  /** Whether the component is initially expanded */
  defaultExpanded?: boolean;
  /** Visual variant */
  variant?: 'default' | 'outline' | 'filled' | 'minimal';
  /** Size variant affecting paddings and text size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** If true, the component can't be collapsed or expanded */
  disabled?: boolean;
  /** Allow only one expander to be open within a group */
  groupId?: string;
  /** Callback when expanded/collapsed state changes */
  onToggle?: (expanded: boolean) => void;
}

const expanderGroups: Record<string, (id: string) => void> = {};

/**
 * DetailExpander component for collapsible content sections
 */
export function DetailExpander({
  title,
  children,
  description,
  icon,
  defaultExpanded = false,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
  groupId,
  onToggle,
}: DetailExpanderProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expanderId] = useState(() => `expander-${Math.random().toString(36).substring(2, 9)}`);

  // Register this expander with its group if a groupId is provided
  React.useEffect(() => {
    if (groupId) {
      const setAsActive = (activeId: string) => {
        if (activeId !== expanderId) {
          setExpanded(false);
        }
      };
      
      expanderGroups[groupId] = setAsActive;
      
      return () => {
        delete expanderGroups[groupId];
      };
    }
  }, [groupId, expanderId]);

  // Toggle expanded state
  const toggleExpanded = () => {
    if (disabled) return;
    
    const newExpandedState = !expanded;
    
    // If this is part of a group, collapse all others
    if (groupId && newExpandedState) {
      expanderGroups[groupId]?.(expanderId);
    }
    
    setExpanded(newExpandedState);
    onToggle?.(newExpandedState);
  };

  // Determine classes based on variant
  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return `border border-${colors.kalosBorder} rounded-lg hover:border-[#BDBDBD]`;
      case 'filled':
        return `bg-${colors.kalosBg} border border-${colors.kalosBorder} rounded-lg`;
      case 'minimal':
        return `border-b border-${colors.kalosBorder}`;
      default:
        return '';
    }
  };

  // Determine size classes
  const sizeClasses = {
    sm: 'text-sm p-3',
    md: 'text-base p-4',
    lg: 'text-lg p-5',
  };

  // Combine all classes
  const containerClasses = cn(
    'transition-all',
    getVariantClasses(),
    variant === 'minimal' && 'rounded-none',
    className
  );

  // Header classes
  const headerClasses = cn(
    'flex items-center justify-between w-full text-left',
    sizeClasses[size],
    !disabled && 'cursor-pointer',
    disabled && 'opacity-70 cursor-default'
  );

  // Content classes with animation
  const contentClasses = cn(
    'overflow-hidden transition-all duration-300',
    expanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
  );

  return (
    <div className={containerClasses}>
      <div
        className={headerClasses}
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div>
            <div className="font-medium">{title}</div>
            {description && (
              <div className={`text-sm text-${colors.kalosMuted} mt-0.5`}>{description}</div>
            )}
          </div>
        </div>
        
        {!disabled && (
          <div className={`ml-4 flex-shrink-0 text-${colors.kalosMuted}`}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>
      
      <div className={contentClasses}>
        <div className={cn('py-1', sizeClasses[size])}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default DetailExpander;