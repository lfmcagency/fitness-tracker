'use client';

import { useEffect } from 'react';
import { useAchievementStore } from '@/store/achievements';
import AchievementTrophy from './AchievementTrophy';

interface TrophyRoomProps {
  className?: string;
  showFilters?: boolean;
}

export default function TrophyRoom({ className = '', showFilters = true }: TrophyRoomProps) {
  const { 
    achievements,
    isLoading,
    error,
    stats,
    statusFilter,
    typeFilter,
    setStatusFilter,
    setTypeFilter,
    getFilteredAchievements,
    fetchAchievements,
    claimAchievement,
    clearError
  } = useAchievementStore();

  // Fetch achievements on mount
  useEffect(() => {
    if (achievements.length === 0 && !isLoading) {
      fetchAchievements();
    }
  }, [fetchAchievements, achievements.length, isLoading]);

  // Handle claim action - delegates to store
  const handleClaim = async (achievementId: string) => {
    const success = await claimAchievement(achievementId);
    if (!success) {
      // Error is handled by store, could show toast here
      console.error(`Failed to claim achievement: ${achievementId}`);
    }
  };

  // Get unique achievement types for filter
  const availableTypes = ['all', ...new Set(achievements.map(a => a.type))];

  // Get filtered achievements
  const filteredAchievements = getFilteredAchievements();

  // Loading state
  if (isLoading && achievements.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Trophy Room</h3>
        </div>
        
        {/* Loading grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg p-6 h-64">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3 mx-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-600 mb-2">Failed to load achievements</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchAchievements();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header with stats */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Trophy Room</h3>
          
          {/* Achievement stats */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-gray-600">{stats.pending} pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{stats.claimed} claimed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">{stats.locked} locked</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Status filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="claimed">Claimed</option>
                <option value="locked">Locked</option>
              </select>
            </div>

            {/* Type filter */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {availableTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {(statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trophy grid */}
      <div className="p-6">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'all' ? 'No achievements yet' : `No ${statusFilter} achievements`}
            </h4>
            <p className="text-gray-500">
              {statusFilter === 'pending' 
                ? 'Complete more tasks and workouts to unlock achievements!' 
                : statusFilter === 'claimed'
                ? 'You haven\'t claimed any achievements yet.'
                : 'Keep grinding to unlock your first achievement!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAchievements.map((achievement) => (
              <AchievementTrophy
                key={achievement.id}
                achievement={achievement}
                onClaim={handleClaim}
                onClick={(achievement) => {
                  // Could open achievement detail modal here
                  console.log('Trophy clicked:', achievement.title);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Claimable XP indicator */}
      {stats.claimableXp > 0 && (
        <div className="border-t p-4 bg-yellow-50">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse"></div>
              <span className="text-yellow-800 font-medium">
                {stats.claimableXp} XP ready to claim!
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}