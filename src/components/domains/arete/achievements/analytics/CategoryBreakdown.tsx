// src/components/domains/arete/analytics/CategoryBreakdown.tsx
'use client';

import { HistoryResponseData } from '@/types/api/progressResponses';

interface CategoryBreakdownProps {
  data: HistoryResponseData | null;
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (!data || data.data.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No category data available</p>
      </div>
    );
  }

  // Calculate category totals from the data
  const categoryTotals = data.data.reduce((totals, entry) => {
    totals.core += entry.core || 0;
    totals.push += entry.push || 0;
    totals.pull += entry.pull || 0;
    totals.legs += entry.legs || 0;
    return totals;
  }, { core: 0, push: 0, pull: 0, legs: 0 });

  const totalXp = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  const categories = [
    { key: 'core', name: 'Core', color: 'bg-blue-500', xp: categoryTotals.core, icon: '🔥' },
    { key: 'push', name: 'Push', color: 'bg-red-500', xp: categoryTotals.push, icon: '💪' },
    { key: 'pull', name: 'Pull', color: 'bg-green-500', xp: categoryTotals.pull, icon: '🎯' },
    { key: 'legs', name: 'Legs', color: 'bg-purple-500', xp: categoryTotals.legs, icon: '🦵' }
  ];

  // Sort by XP (highest first)
  const sortedCategories = [...categories].sort((a, b) => b.xp - a.xp);

  return (
    <div className="bg-white border rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-4">XP by Category</h4>
      
      {totalXp === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">No category XP recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const percentage = totalXp > 0 ? (category.xp / totalXp) * 100 : 0;
            
            return (
              <div key={category.key} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 w-20">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{category.xp.toLocaleString()} XP</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${category.color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}