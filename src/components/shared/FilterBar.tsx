import React, { useState } from 'react';
import { Filter as FilterIcon, X as ClearIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { colors } from '@/lib/colors';

export interface FilterOption {
  /** Unique identifier for the filter option */
  id: string;
  /** Display label for the filter option */
  label: string;
  /** Group this filter belongs to (for mutually exclusive options) */
  group?: string;
  /** Icon to display with the filter (optional) */
  icon?: React.ReactNode;
}

export interface FilterBarProps {
  /** Available filter options */
  options: FilterOption[];
  /** Currently active filter IDs */
  activeFilters: string[];
  /** Callback when filters change */
  onFilterChange: (filters: string[]) => void;
  /** Allow multiple filters from the same group */
  allowMultipleFromGroup?: boolean;
  /** Show selected filters as pills */
  showSelectedPills?: boolean;
  /** Label to show in the filter button */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Visual variant */
  variant?: 'default' | 'outline' | 'minimal';
}

/**
 * FilterBar component for selecting and displaying active filters
 */
export function FilterBar({
  options,
  activeFilters,
  onFilterChange,
  allowMultipleFromGroup = false,
  showSelectedPills = true,
  label = 'Filters',
  className,
  variant = 'default',
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group options by their group property
  const groupedOptions: Record<string, FilterOption[]> = {};
  options.forEach(option => {
    const group = option.group || 'default';
    if (!groupedOptions[group]) {
      groupedOptions[group] = [];
    }
    groupedOptions[group].push(option);
  });

  // Toggle a filter
  const toggleFilter = (filterId: string) => {
    const option = options.find(opt => opt.id === filterId);
    if (!option) return;

    let newFilters: string[];

    if (activeFilters.includes(filterId)) {
      // Remove the filter
      newFilters = activeFilters.filter(id => id !== filterId);
    } else {
      // Add the filter, potentially removing others from the same group
      if (option.group && !allowMultipleFromGroup) {
        const groupOptions = options.filter(opt => opt.group === option.group);
        const groupIds = groupOptions.map(opt => opt.id);
        newFilters = [...activeFilters.filter(id => !groupIds.includes(id)), filterId];
      } else {
        newFilters = [...activeFilters, filterId];
      }
    }

    onFilterChange(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange([]);
    setIsOpen(false);
  };

  // Clear a specific filter
  const clearFilter = (filterId: string) => {
    onFilterChange(activeFilters.filter(id => id !== filterId));
  };

  // Determine variant styling
  const variantClasses = {
    default: `bg-${colors.kalosBg} border border-${colors.kalosBorder} text-${colors.kalosText}`,
    outline: `bg-transparent border border-${colors.kalosText} text-${colors.kalosText}`,
    minimal: `bg-transparent text-${colors.kalosMuted}`,
  };

  // Get active filter objects
  const activeFilterObjects = options.filter(option => 
    activeFilters.includes(option.id)
  );

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-center">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                'flex items-center px-3 py-1.5 rounded-md text-sm',
                variantClasses[variant],
                activeFilters.length > 0 && 'font-medium'
              )}
            >
              <span>{label}</span>
              <FilterIcon className="ml-1.5 w-3.5 h-3.5" />
              {activeFilters.length > 0 && (
                <span className={`ml-1.5 bg-${colors.kalosText} text-white rounded-full w-5 h-5 flex items-center justify-center text-xs`}>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className={`w-56 p-3 bg-${colors.kalosBg} border-${colors.kalosBorder}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Filter by:</h3>
              {activeFilters.length > 0 && (
                <button 
                  onClick={clearAllFilters}
                  className={`text-xs text-${colors.kalosMuted} hover:text-${colors.kalosText} transition-colors`}
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group} className="space-y-1">
                  {group !== 'default' && (
                    <h4 className={`text-xs text-${colors.kalosMuted} uppercase`}>{group}</h4>
                  )}
                  <div className="space-y-2">
                    {groupOptions.map((option) => (
                      <div key={option.id} className="flex items-center">
                        <button
                          onClick={() => toggleFilter(option.id)}
                          className={cn(
                            "w-4 h-4 rounded-sm mr-2 border transition-colors flex items-center justify-center",
                            activeFilters.includes(option.id) 
                              ? `bg-${colors.kalosText} border-${colors.kalosText}` 
                              : `border-${colors.kalosMuted}`
                          )}
                        >
                          {activeFilters.includes(option.id) && (
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          )}
                        </button>
                        <span className="text-sm flex items-center">
                          {option.icon && (
                            <span className="mr-1.5">{option.icon}</span>
                          )}
                          {option.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Selected filter pills */}
      {showSelectedPills && activeFilterObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterObjects.map(filter => (
            <div 
              key={filter.id}
              className={`bg-${colors.kalosBorder} text-${colors.kalosText} px-2 py-1 rounded-full text-xs flex items-center`}
            >
              {filter.icon && (
                <span className="mr-1">{filter.icon}</span>
              )}
              <span>{filter.label}</span>
              <button 
                onClick={() => clearFilter(filter.id)}
                className={`ml-1 text-${colors.kalosMuted} hover:text-${colors.kalosText}`}
              >
                <ClearIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilterBar;