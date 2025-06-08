// src/components/domains/arete/analytics/TimeRangeSelector.tsx
'use client';

import { Button } from '@/components/ui/button';

interface TimeRangeSelectorProps {
  selectedTimeRange: 'week' | 'month' | 'year';
  selectedGroupBy: 'day' | 'week' | 'month';
  onTimeRangeChange: (range: 'week' | 'month' | 'year') => void;
  onGroupByChange: (groupBy: 'day' | 'week' | 'month') => void;
}

export default function TimeRangeSelector({
  selectedTimeRange,
  selectedGroupBy,
  onTimeRangeChange,
  onGroupByChange
}: TimeRangeSelectorProps) {
  const timeRanges = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' }
  ] as const;

  const groupByOptions = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' }
  ] as const;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      {/* Time Range */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Range:</span>
        {timeRanges.map((range) => (
          <Button
            key={range.value}
            variant={selectedTimeRange === range.value ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeRangeChange(range.value)}
            className="text-xs"
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Group By */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Group by:</span>
        {groupByOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedGroupBy === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onGroupByChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}