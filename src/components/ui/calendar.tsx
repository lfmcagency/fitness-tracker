"use client"

import * as React from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
}

export function Calendar({ 
  mode = "single", 
  selected, 
  onSelect, 
  className 
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())
  
  const days = React.useMemo(() => {
    const firstDay = startOfMonth(currentMonth)
    const lastDay = endOfMonth(currentMonth)
    return eachDayOfInterval({ start: firstDay, end: lastDay })
  }, [currentMonth])
  
  const previousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }
  
  const nextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
  }
  
  return (
    <div className={cn("p-3", className)}>
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="text-xs font-medium py-1">
            {day}
          </div>
        ))}
        
        {days.map((day) => {
          const isSelected = selected ? isSameDay(day, selected) : false
          const isCurrentMonth = isSameMonth(day, currentMonth)
          
          return (
            <button
              key={day.toString()}
              onClick={() => onSelect?.(day)}
              className={cn(
                "h-9 w-9 rounded-md text-sm flex items-center justify-center",
                !isCurrentMonth && "text-gray-400",
                isSelected && "bg-kalos-text text-white",
                !isSelected && isCurrentMonth && "hover:bg-gray-100"
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}