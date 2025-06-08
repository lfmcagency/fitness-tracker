// src/components/domains/arete/overview/QuickStats.tsx
'use client';

import { useProgressStore } from '@/store/progress';

export default function QuickStats() {
  const { progress, achievements, weight, categoryProgress } = useProgressStore();

  // Calculate stats from available data
  const getStats = () => {
    const stats = [];

    // Achievement stats
    if (achievements.data && !achievements.isLoading) {
      stats.push({
        label: 'Achievements',
        value: achievements.data.unlockedCount,
        total: achievements.data.totalCount,
        icon: '🏆',
        color: 'text-yellow-600',
        showTotal: true,
      });
    }

    // Category stats
    if (categoryProgress.data && !categoryProgress.isLoading) {
      const categories = Object.values(categoryProgress.data);
      const avgLevel = categories.reduce((sum, cat) => sum + cat.level, 0) / categories.length;
      stats.push({
        label: 'Avg Category Level',
        value: avgLevel.toFixed(1),
        icon: '💪',
        color: 'text-blue-600',
        showTotal: false,
      });
    }

    // Weight trend
    if (weight.data && weight.data.trends && !weight.isLoading) {
      const { direction, totalChange } = weight.data.trends;
      const changeValue = Math.abs(totalChange);
      const unit = weight.data.unit;
      
      stats.push({
        label: 'Weight Trend',
        value: `${direction === 'gain' ? '+' : direction === 'loss' ? '-' : ''}${changeValue}${unit}`,
        icon: direction === 'gain' ? '📈' : direction === 'loss' ? '📉' : '➡️',
        color: direction === 'loss' ? 'text-green-600' : direction === 'gain' ? 'text-red-600' : 'text-gray-600',
        showTotal: false,
      });
    }

    // Main progress stats (always try to show if available)
    if (progress.data && !progress.isLoading) {
      stats.unshift({
        label: 'Current Level',
        value: progress.data.level.current,
        icon: '⭐',
        color: 'text-purple-600',
        showTotal: false,
      });
    }

    return stats;
  };

  const stats = getStats();

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
      
      {/* Show loading if main data is loading */}
      {progress.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No stats available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="text-2xl">{stat.icon}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-xl font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                  {stat.showTotal && stat.total && (
                    <span className="text-sm text-gray-500">/ {stat.total}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Show errors for individual sections */}
      <div className="mt-4 space-y-2">
        {achievements.error && (
          <p className="text-xs text-red-500">⚠️ Achievements unavailable</p>
        )}
        {categoryProgress.error && (
          <p className="text-xs text-red-500">⚠️ Categories unavailable</p>
        )}
        {weight.error && (
          <p className="text-xs text-red-500">⚠️ Weight data unavailable</p>
        )}
      </div>
    </div>
  );
}