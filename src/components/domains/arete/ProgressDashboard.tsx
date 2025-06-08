'use client';

import { useEffect } from 'react';
import { useProgressStore } from '@/store/progress';
import LevelProgress from './overview/LevelProgress';
import QuickStats from './overview/QuickStats';
import RecentAchievements from './overview/RecentAchievements';

export default function ProgressDashboard() {
  const { fetchProgress, refreshAll } = useProgressStore();

  useEffect(() => {
    // Load initial data
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-gray-600">Track your journey toward excellence</p>
        </div>
        <button
          onClick={refreshAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level Progress - Takes more space */}
        <div className="lg:col-span-2">
          <LevelProgress />
        </div>
        
        {/* Quick Stats */}
        <div className="lg:col-span-1">
          <QuickStats />
        </div>
      </div>

      {/* Recent Achievements */}
      <RecentAchievements />

      {/* TODO: Add more sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Category Progress</h3>
          <p className="text-gray-600">Coming soon...</p>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Weight Tracking</h3>
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Progress Analytics</h3>
        <p className="text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}