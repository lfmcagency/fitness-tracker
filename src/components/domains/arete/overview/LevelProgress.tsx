// src/components/domains/arete/overview/LevelProgress.tsx
'use client';

import { useProgressStore } from '@/store/progress';

export default function LevelProgress() {
  const { progress } = useProgressStore();

  // Loading state
  if (progress.isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (progress.error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Failed to load progress</p>
          <p className="text-gray-500 text-sm mt-1">{progress.error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!progress.data) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No progress data available</p>
        </div>
      </div>
    );
  }

  const { level } = progress.data;
  const progressPercent = Math.min(100, Math.max(0, level.progress));

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center space-x-6">
        {/* Level Circle */}
        <div className="relative">
          <div className="w-24 h-24">
            {/* Background circle */}
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${progressPercent * 2.51} 251`}
                className="text-blue-600 transition-all duration-500 ease-out"
                strokeLinecap="round"
              />
            </svg>
            {/* Level number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{level.current}</span>
            </div>
          </div>
        </div>

        {/* Level Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline space-x-2 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">Level {level.current}</h3>
            <span className="text-sm text-gray-500">({progressPercent}%)</span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3">
            {level.xpToNextLevel} XP until level {level.current + 1}
          </p>
          
          <div className="space-y-2">
            {/* XP Progress Bar */}
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{level.xp.toLocaleString()} XP</span>
              <span>{level.nextLevelXp.toLocaleString()} XP</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{level.xp.toLocaleString()}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total XP</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{level.xpToNextLevel.toLocaleString()}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">XP to Next</p>
          </div>
        </div>
      </div>
    </div>
  );
}