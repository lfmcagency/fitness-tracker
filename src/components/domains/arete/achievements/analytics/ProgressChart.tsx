// src/components/domains/arete/analytics/ProgressChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { useProgressStore } from '@/store/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TimeRangeSelector from './TimeRangeSelector';
import CategoryBreakdown from './CategoryBreakdown';

export default function ProgressChart() {
  const { history, fetchHistory } = useProgressStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedGroupBy, setSelectedGroupBy] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchHistory(selectedTimeRange, selectedGroupBy);
  }, [selectedTimeRange, selectedGroupBy, fetchHistory]);

  // Loading state
  if (history.isLoading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Progress Analytics</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (history.error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Progress Analytics</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchHistory(selectedTimeRange, selectedGroupBy)}
          >
            Retry
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Failed to load analytics</p>
          <p className="text-gray-500 text-sm mt-1">{history.error}</p>
        </div>
      </Card>
    );
  }

  const hasData = history.data && history.data.data.length > 0;

  // Simple chart rendering (you could use a library like recharts here)
  const renderSimpleChart = () => {
    if (!hasData) return null;

    const data = history.data!.data;
    const maxXp = Math.max(...data.map(d => d.xp));
    const chartHeight = 200;
    
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">XP Over Time</h4>
          <div className="text-sm text-gray-500">
            Total: {history.data!.totalXp.toLocaleString()} XP
          </div>
        </div>
        
        <div className="relative" style={{ height: chartHeight }}>
          <svg className="w-full h-full">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(percent => (
              <line
                key={percent}
                x1="0"
                y1={`${percent}%`}
                x2="100%"
                y2={`${percent}%`}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            ))}
            
            {/* Data bars */}
            {data.map((point, index) => {
              const height = maxXp > 0 ? (point.xp / maxXp) * chartHeight : 0;
              const x = (index / Math.max(1, data.length - 1)) * 100;
              
              return (
                <rect
                  key={index}
                  x={`${x - 1}%`}
                  y={chartHeight - height}
                  width="2%"
                  height={height}
                  fill="#3b82f6"
                  className="hover:fill-blue-700 transition-colors"
                >
                  <title>{point.xp} XP on {point.date}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Progress Analytics</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchHistory(selectedTimeRange, selectedGroupBy)}
        >
          Refresh
        </Button>
      </div>

      {/* Time Range Controls */}
      <TimeRangeSelector
        selectedTimeRange={selectedTimeRange}
        selectedGroupBy={selectedGroupBy}
        onTimeRangeChange={setSelectedTimeRange}
        onGroupByChange={setSelectedGroupBy}
      />

      {!hasData ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">No progress data yet</h4>
          <p className="text-gray-600 text-sm">Start training to see your progress analytics!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart */}
          {renderSimpleChart()}
          
          {/* Category Breakdown */}
          <CategoryBreakdown data={history.data} />
          
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{history.data!.dataPoints}</p>
              <p className="text-sm text-gray-500">Data Points</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{history.data!.totalXp.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total XP</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(history.data!.totalXp / Math.max(1, history.data!.dataPoints))}
              </p>
              <p className="text-sm text-gray-500">Avg XP/Day</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}