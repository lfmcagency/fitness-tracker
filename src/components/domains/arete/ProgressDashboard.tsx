'use client';

import { useEffect } from 'react';
import { useProgressStore } from '@/store/progress';
import { useAchievementStore } from '@/store/achievements';
import LevelProgress from './overview/LevelProgress';
import QuickStats from './overview/QuickStats';
import RecentAchievements from './overview/RecentAchievements';
import CategoryGrid from './categories/CategoryGrid';
import WeightTracker from './weight/WeightTracker';
import TrophyRoom from './achievements/TrophyRoom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function ProgressDashboard() {
  const { refreshAll } = useProgressStore();
  const { fetchAchievements } = useAchievementStore();

  useEffect(() => {
  refreshAll();
  fetchAchievements();
}, []); // <- Empty dependency array, run once on mount

  const handleRefreshAll = async () => {
    await Promise.allSettled([
      refreshAll(),
      fetchAchievements()
    ]);
  };

  return (
    <div className="space-y-8">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-kalos-text">Your Progress</h2>
          <p className="text-kalos-muted mt-1">Track your journey across all domains</p>
        </div>
        <Button
          onClick={handleRefreshAll}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Top row - Level progress and quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LevelProgress />
        </div>
        <div className="lg:col-span-1">
          <QuickStats />
        </div>
      </div>

      {/* Recent achievements overview */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-kalos-text">Recent Achievements</h3>
        <RecentAchievements />
      </section>

      {/* Trophy Room - full achievement cabinet */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-kalos-text">Trophy Room</h3>
        <TrophyRoom />
      </section>

      {/* Category progress grid */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-kalos-text">Category Progress</h3>
        <CategoryGrid />
      </section>

      {/* Weight tracking */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-kalos-text">Weight Tracking</h3>
        <WeightTracker />
      </section>
    </div>
  );
}