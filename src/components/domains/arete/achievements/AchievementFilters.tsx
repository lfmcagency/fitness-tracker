// src/components/domains/arete/achievements/AchievementFilters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface AchievementFiltersProps {
  statusFilter: 'all' | 'unlocked' | 'locked';
  typeFilter: string;
  availableTypes: string[];
  onStatusChange: (filter: 'all' | 'unlocked' | 'locked') => void;
  onTypeChange: (type: string) => void;
  totalCount: number;
}

export default function AchievementFilters({
  statusFilter,
  typeFilter,
  availableTypes,
  onStatusChange,
  onTypeChange,
  totalCount
}: AchievementFiltersProps) {
  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'unlocked', label: 'Unlocked' },
    { value: 'locked', label: 'Locked' }
  ] as const;

  const typeFilters = [
    { value: 'all', label: 'All Types' },
    ...availableTypes.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }))
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      {/* Status Filter Buttons */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(filter.value)}
            className="text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Type Filter Dropdown */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Type:</span>
        <select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {typeFilters.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        {totalCount} {totalCount === 1 ? 'achievement' : 'achievements'}
      </div>
    </div>
  );
}