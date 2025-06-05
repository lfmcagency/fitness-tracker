'use client'

import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TaskFiltersProps {
  showFilters: boolean
  onToggleFilters: () => void
  activeFilters: string[]
  onFilterChange: (filters: string[]) => void
}

export default function TaskFilters({ 
  showFilters, 
  onToggleFilters, 
  activeFilters, 
  onFilterChange 
}: TaskFiltersProps) {
  const filterOptions = [
    { id: 'completed', label: 'Completed', group: 'status' },
    { id: 'incomplete', label: 'Incomplete', group: 'status' },
    { id: 'high', label: 'High Priority', group: 'priority' },
    { id: 'medium', label: 'Medium Priority', group: 'priority' },
    { id: 'low', label: 'Low Priority', group: 'priority' },
    { id: 'nous', label: 'Nous', group: 'category' },
    { id: 'soma', label: 'Soma', group: 'category' },
    { id: 'trophe', label: 'Trophe', group: 'category' },
  ]

  const toggleFilter = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      onFilterChange(activeFilters.filter(id => id !== filterId))
    } else {
      onFilterChange([...activeFilters, filterId])
    }
  }

  const clearFilters = () => {
    onFilterChange([])
  }

  const filterCount = activeFilters.length

  return (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-medium">Tasks</h2>
      
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="flex items-center text-kalos-muted text-sm hover:text-kalos-text transition-colors"
          >
            Filters
            {filterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-kalos-dark text-white text-xs rounded-full">
                {filterCount}
              </span>
            )}
            <Filter className="ml-1 w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-kalos-bg border-kalos-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filter by:</h3>
              {filterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-kalos-muted hover:text-kalos-text"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Status filters */}
            <div>
              <h4 className="text-xs text-kalos-muted mb-2">Status</h4>
              <div className="space-y-1">
                {filterOptions.filter(opt => opt.group === 'status').map((option) => (
                  <label key={option.id} className="flex items-center cursor-pointer">
                    <button
                      type="button"
                      onClick={() => toggleFilter(option.id)}
                      className={cn(
                        "w-4 h-4 rounded-sm mr-2 border transition-colors",
                        activeFilters.includes(option.id) 
                          ? "bg-kalos-dark border-kalos-dark" 
                          : "border-kalos-muted"
                      )}
                    >
                      {activeFilters.includes(option.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm select-none">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Priority filters */}
            <div>
              <h4 className="text-xs text-kalos-muted mb-2">Priority</h4>
              <div className="space-y-1">
                {filterOptions.filter(opt => opt.group === 'priority').map((option) => (
                  <label key={option.id} className="flex items-center cursor-pointer">
                    <button
                      type="button"
                      onClick={() => toggleFilter(option.id)}
                      className={cn(
                        "w-4 h-4 rounded-sm mr-2 border transition-colors",
                        activeFilters.includes(option.id) 
                          ? "bg-kalos-dark border-kalos-dark" 
                          : "border-kalos-muted"
                      )}
                    >
                      {activeFilters.includes(option.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm select-none">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Category filters */}
            <div>
              <h4 className="text-xs text-kalos-muted mb-2">Category</h4>
              <div className="space-y-1">
                {filterOptions.filter(opt => opt.group === 'category').map((option) => (
                  <label key={option.id} className="flex items-center cursor-pointer">
                    <button
                      type="button"
                      onClick={() => toggleFilter(option.id)}
                      className={cn(
                        "w-4 h-4 rounded-sm mr-2 border transition-colors",
                        activeFilters.includes(option.id) 
                          ? "bg-kalos-dark border-kalos-dark" 
                          : "border-kalos-muted"
                      )}
                    >
                      {activeFilters.includes(option.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm select-none">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}