import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export interface CategoryOption {
  /** Unique identifier for the category */
  id: string;
  /** Display name for the category */
  label: string;
  /** Optional badge count to show with category */
  badgeCount?: number;
  /** Icon to display (optional) */
  icon?: React.ReactNode;
  /** Background color for selected state */
  color?: string;
}

export interface CategoryPillsProps {
  /** Available category options */
  categories: CategoryOption[];
  /** Selected category ID(s) */
  selected: string | string[];
  /** Callback when selection changes */
  onSelect: (categoryId: string) => void;
  /** Allow multiple selections */
  multiSelect?: boolean;
  /** Visual variant */
  variant?: 'filled' | 'outline' | 'minimal';
  /** Show scroll buttons when categories overflow */
  showScrollButtons?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CategoryPills component for horizontal scrollable category selection
 */
export function CategoryPills({
  categories,
  selected,
  onSelect,
  multiSelect = false,
  variant = 'filled',
  showScrollButtons = true,
  className,
}: CategoryPillsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Check if a category is selected
  const isSelected = (categoryId: string) => {
    if (Array.isArray(selected)) {
      return selected.includes(categoryId);
    }
    return selected === categoryId;
  };

  // Handle scrolling logic
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10); // 10px buffer
  };

  // Listen for scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Check initially
      checkScroll();
      
      // Check on window resize
      window.addEventListener('resize', checkScroll);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Check for scroll buttons on mount and when categories change
  useEffect(() => {
    checkScroll();
  }, [categories]);

  // Handle scroll button clicks
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Variant styles
  const getVariantClasses = (isActive: boolean) => {
    switch (variant) {
      case 'filled':
        return isActive
          ? `bg-${colors.kalosText} text-white border-transparent`
          : `bg-${colors.kalosBg} border-${colors.kalosBorder} hover:bg-${colors.kalosHighlight} text-${colors.kalosText}`;
      case 'outline':
        return isActive
          ? `bg-transparent border-${colors.kalosText} text-${colors.kalosText}`
          : `bg-transparent border-${colors.kalosBorder} text-${colors.kalosMuted} hover:border-${colors.kalosText} hover:text-${colors.kalosText}`;
      case 'minimal':
        return isActive
          ? `bg-transparent border-b-2 border-${colors.kalosText} text-${colors.kalosText} rounded-none px-3`
          : `bg-transparent border-b-2 border-transparent text-${colors.kalosMuted} hover:text-${colors.kalosText} rounded-none px-3`;
      default:
        return '';
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center">
        {/* Left scroll button */}
        {showScrollButtons && showLeftScroll && (
          <button
            onClick={scrollLeft}
            className={`absolute left-0 z-10 flex items-center justify-center w-6 h-6 bg-${colors.kalosBg}/90 rounded-full border border-${colors.kalosBorder}`}
            aria-label="Scroll left"
          >
            <ChevronLeft className={`w-4 h-4 text-${colors.kalosText}`} />
          </button>
        )}

        {/* Scrollable categories */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto py-1 scrollbar-hide"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div className="flex space-x-2 px-1">
            {categories.map((category) => {
              const isActive = isSelected(category.id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => onSelect(category.id)}
                  className={cn(
                    'flex items-center whitespace-nowrap rounded-full py-1.5 px-4 text-sm font-medium transition-colors border',
                    getVariantClasses(isActive),
                    variant !== 'minimal' && 'rounded-full',
                    category.color && isActive && variant === 'filled' && `bg-[${category.color}]`
                  )}
                  style={isActive && category.color && variant === 'filled' ? { backgroundColor: category.color } : {}}
                >
                  {category.icon && (
                    <span className="mr-1.5">{category.icon}</span>
                  )}
                  <span>{category.label}</span>
                  {category.badgeCount !== undefined && (
                    <span className={cn(
                      'ml-1.5 px-1.5 py-0.5 text-xs rounded-full',
                      isActive 
                        ? variant === 'filled' ? 'bg-white/20 text-white' : `bg-${colors.kalosText} text-white`
                        : `bg-${colors.kalosBorder} text-${colors.kalosMuted}`
                    )}>
                      {category.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right scroll button */}
        {showScrollButtons && showRightScroll && (
          <button
            onClick={scrollRight}
            className={`absolute right-0 z-10 flex items-center justify-center w-6 h-6 bg-${colors.kalosBg}/90 rounded-full border border-${colors.kalosBorder}`}
            aria-label="Scroll right"
          >
            <ChevronRight className={`w-4 h-4 text-${colors.kalosText}`} />
          </button>
        )}
      </div>
    </div>
  );
}

// Add CSS for hiding scrollbars
if (typeof document !== 'undefined') {
  // Only run in browser environment
  const style = document.createElement('style');
  style.textContent = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;
  document.head.appendChild(style);
}

export default CategoryPills;