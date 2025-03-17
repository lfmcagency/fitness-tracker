// src/components/routine/DateSelector.tsx
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DateSelectorProps {
  date: Date
  onDateChange: (date: Date) => void
}

export default function DateSelector({ date, onDateChange }: DateSelectorProps) {
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-base font-medium hover:opacity-80 transition-opacity">
          {isToday ? "Today" : format(date, "MMMM d, yyyy")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-kalos-background border-[#E5E0DC]">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate: Date) => newDate && onDateChange(newDate)}
          className="rounded-md bg-kalos-background"
        />
      </PopoverContent>
    </Popover>
  )
}