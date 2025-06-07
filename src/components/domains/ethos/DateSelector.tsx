'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DateSelectorProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  // Parse the selected date
  const currentDate = new Date(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize for comparison
  currentDate.setHours(0, 0, 0, 0);

  // Check if selected date is today
  const isToday = currentDate.getTime() === today.getTime();

  // Format date for display
  const formatDisplayDate = (date: Date): string => {
    if (isToday) return 'Today';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    // Format as "Mon, Jan 15"
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const dateString = prevDate.toISOString().split('T')[0];
    console.log('📅 [DateSelector] Going to previous day:', dateString);
    onDateChange(dateString);
  };

  // Navigate to next day  
  const goToNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const dateString = nextDate.toISOString().split('T')[0];
    console.log('📅 [DateSelector] Going to next day:', dateString);
    onDateChange(dateString);
  };

  // Jump to today
  const goToToday = () => {
    const todayString = new Date().toISOString().split('T')[0];
    console.log('📅 [DateSelector] Jumping to today:', todayString);
    onDateChange(todayString);
  };

  // Handle date input change (for direct date selection)
  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    if (newDate) {
      console.log('📅 [DateSelector] Date input changed to:', newDate);
      onDateChange(newDate);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        {/* Previous Day Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousDay}
          className="px-3"
          title="Previous day"
        >
          ←
        </Button>

        {/* Date Display & Picker */}
        <div className="flex flex-col items-center min-w-[120px]">
          <div className="text-sm font-medium text-gray-900">
            {formatDisplayDate(currentDate)}
          </div>
          
          {/* Hidden date input for native date picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateInputChange}
            className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer hover:text-blue-600 transition-colors"
            title="Click to pick a date"
          />
        </div>

        {/* Next Day Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          className="px-3"
          title="Next day"
        >
          →
        </Button>

        {/* Today Button (only show if not already today) */}
        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="ml-2 text-xs px-3"
            title="Jump to today"
          >
            Today
          </Button>
        )}
      </div>

      {/* Week Context (optional - shows what day of week it is) */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500">
          {currentDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>
    </Card>
  );
}