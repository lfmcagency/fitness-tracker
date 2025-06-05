'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1))
  }

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const displayText = isToday(selectedDate) 
    ? "Today" 
    : format(selectedDate, 'EEEE, MMMM d')

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handlePreviousDay}
        className="p-2 hover:bg-kalos-border rounded-lg transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5 text-kalos-muted" />
      </button>
      
      <Popover>
        <PopoverTrigger asChild>
          <button className="text-base font-medium hover:opacity-80 transition-opacity">
            {displayText}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-kalos-bg border-kalos-border">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            className="rounded-md bg-kalos-bg"
          />
        </PopoverContent>
      </Popover>

      <button
        onClick={handleNextDay}
        className="p-2 hover:bg-kalos-border rounded-lg transition-colors"
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5 text-kalos-muted" />
      </button>

      {!isToday(selectedDate) && (
        <button
          onClick={handleToday}
          className="text-sm text-kalos-muted hover:text-kalos-text transition-colors"
        >
          Today
        </button>
      )}
    </div>
  )
}