// src/components/domains/arete/achievements/AchievementGallery.tsx
'use client';

import { useEffect, useState } from 'react';
import { useProgressStore } from '@/store/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AchievementCard from './AchievementCard';
import AchievementFilters from './AchievementFilters';

export default function AchievementGallery() {
  const { achievements, fetchAchievements } = useProgressStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!achievements.data && !achievements.isLoading) {
      fetchAchievements();
    }
  }, [achievements.data, achievements.isLoading, fetchAchievements]);

  // Loading state
  if (achievements.isLoading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (achievements.error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Achievements</h3>
          <Button variant="outline" size="sm" onClick={fetchAchievements}>
            Retry
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Failed to load achievements</p>
          <p className="text-gray-500 text-sm mt-1">{achievements.error}</p>
        </div>
      </Card>
    );
  }

  const achievementList = achievements.data?.list || [];
  
  // Filter achievements
  const filteredAchievements = achievementList.filter(achievement => {
    const statusMatch = filter === 'all' || 
      (filter === 'unlocked' && achievement.unlocked) ||
      (filter === 'locked' && !achievement.unlocked);
    
    const typeMatch = typeFilter === 'all' || achievement.type === typeFilter;
    
    return statusMatch && typeMatch;
  });

  // Get available types for filter
  const availableTypes = [...new Set(achievementList.map(a => a.type))];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Achievements</h3>
          {achievements.data && (
            <p className="text-sm text-gray-500 mt-1">
              {achievements.data.unlockedCount} of {achievements.data.totalCount} unlocked
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchAchievements}>
          Refresh
        </Button>
      </div>

      {achievementList.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">No achievements yet</h4>
          <p className="text-gray-600 text-sm">Start training to unlock your first achievement!</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <AchievementFilters
            statusFilter={filter}
            typeFilter={typeFilter}
            availableTypes={availableTypes}
            onStatusChange={setFilter}
            onTypeChange={setTypeFilter}
            totalCount={filteredAchievements.length}
          />

          {/* Achievement Grid */}
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No achievements match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}