import React, { useState } from 'react';
import { format, addDays, subDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/colors';

export interface DateNavigatorProps {
  /** Current selected date */
  date: Date;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Format to display the date */
  displayFormat?: string;
  /** Whether to show today indicator */
  showToday?: boolean;
  /** Whether to use relative date names (Today, Yesterday, Tomorrow) */
  useRelativeDates?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show calendar popup */
  showCalendar?: boolean;
}

/**
 * DateNavigator component for selecting and navigating dates
 */
export function DateNavigator({
  date,
  onDateChange,
  displayFormat = 'MMMM d, yyyy',
  showToday = true,
  useRelativeDates = true,
  className,
  showCalendar = true,
}: DateNavigatorProps) {
  const goToPreviousDay = () => {
    onDateChange(subDays(date, 1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(date, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Format date display, using relative terms if enabled
  const getDisplayDate = () => {
    if (useRelativeDates) {
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      if (isTomorrow(date)) return 'Tomorrow';
    }
    return format(date, displayFormat);
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button 
        className={`p-2 text-${colors.kalosMuted} hover:text-${colors.kalosText} transition-colors`}
        onClick={goToPreviousDay}
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="flex items-center">
        {showCalendar ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-base font-medium hover:opacity-80 transition-opacity flex items-center">
                {getDisplayDate()}
                <CalendarIcon className={`ml-2 w-4 h-4 text-${colors.kalosMuted}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className={`w-auto p-0 bg-${colors.kalosBg} border-${colors.kalosBorder}`}>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && onDateChange(newDate)}
                className={`rounded-md bg-${colors.kalosBg}`}
              />
              {showToday && !isToday(date) && (
                <div className={`border-t border-${colors.kalosBorder} p-2`}>
                  <button 
                    onClick={goToToday}
                    className={`w-full text-sm text-center py-1 text-${colors.kalosText} hover:bg-${colors.kalosBorder} rounded transition-colors`}
                  >
                    Go to today
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-base font-medium">
            {getDisplayDate()}
          </span>
        )}
      </div>
      
      <button 
        className={`p-2 text-${colors.kalosMuted} hover:text-${colors.kalosText} transition-colors`}
        onClick={goToNextDay}
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default DateNavigator;