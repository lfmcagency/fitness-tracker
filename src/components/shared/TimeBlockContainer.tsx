import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

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

  // Default accent color
  const defaultAccentColor = {
    'Morning': '#F9CF93', // Soft orange/yellow for morning
    'Afternoon': '#B5DEFF', // Light blue for afternoon
    'Evening': '#D0A5C0', // Muted purple for evening
  }[title] || '#E5E0DC'; // Default color
  
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
            className="text-[#6B6B6B] text-sm font-medium"
            style={{ 
              borderBottom: `2px solid ${headerBorderColor}`,
              paddingBottom: '2px' 
            }}
          >
            {title}
          </h3>
          {timeRange && (
            <span className="ml-2 text-xs text-[#6B6B6B]">
              {timeRange}
            </span>
          )}
        </div>
        
        {showAddButton && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center justify-center w-6 h-6 rounded-full text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors bg-[#E5E0DC] hover:bg-[#D0CCC7]"
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
                <div className="text-sm text-[#6B6B6B]">
                  <p>No items for this time block</p>
                  {showAddButton && onAdd && (
                    <button
                      onClick={onAdd}
                      className="mt-2 text-[#1A1A1A] underline hover:no-underline"
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