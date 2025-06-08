// src/components/domains/arete/weight/WeightTracker.tsx
'use client';

import { useEffect } from 'react';
import { useProgressStore } from '@/store/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Tabs from '@/components/ui/tabs';
import WeightChart from './WeightChart';
import WeightEntryForm from './WeightEntryForm';
import WeightHistory from './WeightHistory';

export default function WeightTracker() {
  const { weight, fetchWeightHistory } = useProgressStore();

  useEffect(() => {
    if (!weight.data && !weight.isLoading) {
      fetchWeightHistory();
    }
  }, [weight.data, weight.isLoading, fetchWeightHistory]);

  // Loading state
  if (weight.isLoading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Weight Tracking</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (weight.error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Weight Tracking</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchWeightHistory}
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
          <p className="text-red-600 font-medium">Failed to load weight data</p>
          <p className="text-gray-500 text-sm mt-1">{weight.error}</p>
        </div>
      </Card>
    );
  }

  const hasData = weight.data && weight.data.history.length > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Weight Tracking</h3>
        <div className="flex items-center space-x-2">
          {hasData && weight.data?.trends && (
            <div className="text-sm text-gray-600">
              <span className={`font-medium ${
                weight.data.trends.direction === 'loss' ? 'text-green-600' : 
                weight.data.trends.direction === 'gain' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {weight.data.trends.direction === 'gain' ? '+' : 
                 weight.data.trends.direction === 'loss' ? '-' : ''}
                {Math.abs(weight.data.trends.totalChange)}{weight.data.unit}
              </span>
              <span className="text-gray-500 ml-1">
                ({weight.data.trends.weeklyRate > 0 ? '+' : ''}{weight.data.trends.weeklyRate}{weight.data.unit}/week)
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchWeightHistory}>
            Refresh
          </Button>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">Start tracking your weight</h4>
          <p className="text-gray-600 text-sm mb-6">Add your first weight entry to begin tracking trends and progress.</p>
          <WeightEntryForm />
        </div>
      ) : (
        <Tabs defaultValue="chart" className="w-full">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button 
                data-tab="chart"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm tab-active:border-blue-500 tab-active:text-blue-600"
              >
                Chart
              </button>
              <button 
                data-tab="add"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
              >
                Add Entry
              </button>
              <button 
                data-tab="history"
                className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
              >
                History
              </button>
            </nav>
          </div>

          <div data-tab-content="chart">
            <WeightChart data={weight.data} />
          </div>
          
          <div data-tab-content="add" className="hidden">
            <WeightEntryForm />
          </div>
          
          <div data-tab-content="history" className="hidden">
            <WeightHistory data={weight.data} />
          </div>
        </Tabs>
      )}
    </Card>
  );
}