// src/components/routine/TaskFilters.tsx
import { Filter } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface TaskFiltersProps {
  activeFilters: string[]
  toggleFilter: (filterId: string) => void
}

export default function TaskFilters({ activeFilters, toggleFilter }: TaskFiltersProps) {
  const filterOptions = [
    { id: "completed", label: "Completed" },
    { id: "incomplete", label: "Incomplete" },
    { id: "high", label: "High Priority" },
    { id: "medium", label: "Medium Priority" },
    { id: "low", label: "Low Priority" },
    { id: "nous", label: "Nous" },
    { id: "soma", label: "Soma" },
    { id: "trophe", label: "Trophe" },
  ]
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center text-kalos-secondary text-sm hover:opacity-80 transition-opacity">
          Filters <Filter className="ml-1 w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 bg-kalos-background border-[#E5E0DC]">
        <div className="space-y-2">
          <h3 className="text-sm font-medium mb-2">Filter by:</h3>
          {filterOptions.map((option) => (
            <div key={option.id} className="flex items-center">
              <button
                onClick={() => toggleFilter(option.id)}
                className={cn(
                  "w-4 h-4 rounded-sm mr-2 border transition-colors",
                  activeFilters.includes(option.id) ? "bg-kalos-text border-kalos-text" : "border-kalos-secondary"
                )}
              />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}