import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { colors } from '@/lib/colors';

export interface TimeBlockContainerProps {
  /** Title of the time block */
  title: string;
  /** Time range displayed in the header (optional) */
  timeRange?: string;
  /** Children to render inside the container */
  children: React.ReactNode;
  /** Whether the section can be collapsed */
  collapsible?: boolean;
  /** Whether the section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Callback when the 'add' button is clicked */
  onAdd?: () => void;
  /** Show the add button */
  showAddButton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Color accent for the time block */
  accentColor?: string;
  /** Whether the time block is empty */
  isEmpty?: boolean;
  /** Content to show when empty */
  emptyContent?: React.ReactNode;
}

/**
 * TimeBlockContainer component for organizing content by time periods
 */
export function TimeBlockContainer({
  title,
  timeRange,
  children,
  collapsible = false,
  defaultCollapsed = false,
  onAdd,
  showAddButton = false,
  className,
  accentColor,
  isEmpty = false,
  emptyContent,
}: TimeBlockContainerProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // Toggle collapsed state
  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Default accent color based on time block title
  let defaultAccentColor;
  
  switch (title) {
    case 'Morning':
      defaultAccentColor = colors.timeBlockMorning;
      break;
    case 'Afternoon':
      defaultAccentColor = colors.timeBlockAfternoon;
      break;
    case 'Evening':
      defaultAccentColor = colors.timeBlockEvening;
      break;
    default:
      defaultAccentColor = colors.kalosBorder;
  }
  
  const headerBorderColor = accentColor || defaultAccentColor;

  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            'flex items-center',
            collapsible && 'cursor-pointer'
          )}
          onClick={toggleCollapse}
        >
          <h3 
            className={`text-${colors.kalosMuted} text-sm font-medium`}
            style={{ 
              borderBottom: `2px solid ${headerBorderColor}`,
              paddingBottom: '2px' 
            }}
          >
            {title}
          </h3>
          {timeRange && (
            <span className={`ml-2 text-xs text-${colors.kalosMuted}`}>
              {timeRange}
            </span>
          )}
        </div>
        
        {showAddButton && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className={`flex items-center justify-center w-6 h-6 rounded-full text-${colors.kalosMuted} hover:text-${colors.kalosText} transition-colors bg-${colors.kalosBorder} hover:bg-${colors.kalosHighlight}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <div className={cn('space-y-4')}>
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              {emptyContent || (
                <div className={`text-sm text-${colors.kalosMuted}`}>
                  <p>No items for this time block</p>
                  {showAddButton && onAdd && (
                    <button
                      onClick={onAdd}
                      className={`mt-2 text-${colors.kalosText} underline hover:no-underline`}
                    >
                      Add an item
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

export default TimeBlockContainer;