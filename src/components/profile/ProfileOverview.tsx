'use client';

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { useProgressStore } from '@/store/progress';
import { useSession } from 'next-auth/react';
import ProfileCard from './ProfileCard';
import ProfileSettings from './ProfileSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/shared';

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* ProfileCard skeleton */}
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm animate-pulse p-6">
      <div className="flex items-center space-x-4">
        <div className="rounded-full bg-kalos-border h-12 w-12"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-kalos-border rounded w-3/4"></div>
          <div className="h-3 bg-kalos-border rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="h-8 bg-kalos-border rounded"></div>
        <div className="h-8 bg-kalos-border rounded"></div>
        <div className="h-8 bg-kalos-border rounded"></div>
      </div>
    </div>
    {/* Settings skeleton */}
    <div className="animate-pulse space-y-4 p-4 border border-kalos-border rounded-lg">
      <div className="h-6 bg-kalos-border rounded w-1/2 mb-4"></div>
      <div className="h-10 bg-kalos-border rounded w-full"></div>
      <div className="h-10 bg-kalos-border rounded w-full"></div>
    </div>
  </div>
);

const ProfileOverview: React.FC = () => {
  const { status } = useSession();
  
  // User store
  const {
    initializeUser,
    profile,
    isLoadingProfile,
    error: userError,
  } = useUserStore();

  // Progress store
  const {
    refreshAll,
    progress,
    achievements,
    categoryProgress,
    isLoading: isLoadingProgress,
    error: progressError,
  } = useProgressStore((state) => ({
    refreshAll: state.refreshAll,
    progress: state.progress,
    achievements: state.achievements,
    categoryProgress: state.categoryProgress,
    isLoading: state.progress.isLoading || state.achievements.isLoading || state.categoryProgress.isLoading,
    error: state.progress.error || state.achievements.error || state.categoryProgress.error,
  }));

  // Initialize both stores when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      console.log("ProfileOverview: Initializing both user and progress data...");
      
      // Start user data if not already loading/loaded
      if (!profile && !isLoadingProfile) {
        initializeUser();
      }
      
      // Start progress data if not already loading/loaded  
      if (!progress.data && !isLoadingProgress) {
        refreshAll();
      }
    }
  }, [status, initializeUser, refreshAll, profile, isLoadingProfile, progress.data, isLoadingProgress]);

  // --- Render Logic ---

  // 1. Auth loading
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kalos-text"></div>
      </div>
    );
  }

  // 2. Not authenticated
  if (status !== 'authenticated') {
    return (
      <div className="text-center p-8">
        <p className="text-kalos-muted">Please sign in to view your profile.</p>
      </div>
    );
  }

  // 3. Still loading initial data
  if ((isLoadingProfile && !profile) || (isLoadingProgress && !progress.data)) {
    return <LoadingSkeleton />;
  }

  // 4. Main content - both stores have data
  const progressData = progress.data;
  const achievementsData = achievements.data;
  const categoryData = categoryProgress.data;

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {(userError || progressError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {userError || progressError}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <section>
        <ProfileCard showActions={false} showStatsSummary={true} />
      </section>

      {/* Progress Overview - Real data from progress store */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Level"
                value={progressData?.level?.current ?? 1}
                variant="filled"
                size="sm"
              />
              <StatCard
                title="Total XP"
                value={progressData?.level?.xp ?? 0}
                variant="filled"
                size="sm"
              />
              <StatCard
                title="Achievements"
                value={`${achievementsData?.unlockedCount ?? 0}/${achievementsData?.totalCount ?? 0}`}
                variant="filled"
                size="sm"
              />
              <StatCard
                title="XP to Next"
                value={progressData?.level?.xpToNextLevel ?? 0}
                variant="filled"
                size="sm"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Category Progress - Real data from progress store */}
      {categoryData && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Domain Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Core"
                  value={`Lvl ${categoryData.core?.level ?? 1}`}
                  variant="outline"
                  size="sm"
                />
                <StatCard
                  title="Push"
                  value={`Lvl ${categoryData.push?.level ?? 1}`}
                  variant="outline"
                  size="sm"
                />
                <StatCard
                  title="Pull"
                  value={`Lvl ${categoryData.pull?.level ?? 1}`}
                  variant="outline"
                  size="sm"
                />
                <StatCard
                  title="Legs"
                  value={`Lvl ${categoryData.legs?.level ?? 1}`}
                  variant="outline"
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Settings Section */}
      <section>
        <ProfileSettings />
      </section>

      {/* Quick Links */}
      <section>
        <Card className="text-center p-4 border-dashed border-kalos-border">
          <p className="text-kalos-muted text-sm">
            Visit <strong>Arete</strong> for detailed progress tracking and analytics
          </p>
        </Card>
      </section>
    </div>
  );
};

export default ProfileOverview;