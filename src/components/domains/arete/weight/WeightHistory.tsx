// src/components/domains/arete/weight/WeightHistory.tsx
'use client';

import { useState } from 'react';
import { useProgressStore } from '@/store/progress';
import { Button } from '@/components/ui/button';
import { ApiWeightEntry } from '@/types/api/userResponses';

interface WeightHistoryProps {
  data: {
    history: import('@/types/api/userResponses').ApiWeightEntry[];
    unit: 'kg' | 'lbs';
  } | null;
}

export default function WeightHistory({ data }: WeightHistoryProps) {
  const { deleteWeightEntry } = useProgressStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!data || data.history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No weight entries yet</p>
      </div>
    );
  }

  // Sort by date (newest first)
  const sortedHistory = [...data.history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleDelete = async (entryId: string) => {
    if (!entryId || !window.confirm('Delete this weight entry?')) return;
    
    setDeletingId(entryId);
    try {
      await deleteWeightEntry(entryId);
    } catch (error) {
      console.error('Failed to delete weight entry:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getWeightChange = (currentWeight: number, index: number) => {
    if (index >= sortedHistory.length - 1) return null;
    const previousWeight = sortedHistory[index + 1].weight;
    const change = currentWeight - previousWeight;
    return change;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Weight History</h4>
        <span className="text-sm text-gray-500">
          {sortedHistory.length} entries
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedHistory.map((entry, index) => {
          const change = getWeightChange(entry.weight, index);
          const isDeleting = deletingId === entry._id;
          
          return (
            <div
              key={entry._id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                isDeleting ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-center">
                  <p className="font-medium text-gray-900">
                    {entry.weight}{data.unit}
                  </p>
                  {change !== null && (
                    <p className={`text-xs ${
                      change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}{data.unit}
                    </p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(entry.date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.date).toLocaleDateString('en-US', { 
                      weekday: 'short'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Optional: Add edit button here later */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entry._id!)}
                  disabled={isDeleting || !entry._id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}