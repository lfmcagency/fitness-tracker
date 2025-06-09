'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { useProgressStore } from '@/store/progress';
import { ProgressRing, StatCard } from '@/components/shared';
import { colors } from '@/lib/colors';

interface ProfileCardProps {
  compact?: boolean;
  showActions?: boolean;
  showStatsSummary?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  compact = false,
  showActions = false,
  showStatsSummary = true,
}) => {
  const { profile, isLoadingProfile } = useUserStore();
  const { progress, achievements, isLoading: isLoadingProgress } = useProgressStore((state) => ({
    progress: state.progress.data,
    achievements: state.achievements.data,
    isLoading: state.progress.isLoading || state.achievements.isLoading,
  }));

  // --- Loading Skeleton ---
  if ((isLoadingProfile && !profile) || (isLoadingProgress && !progress)) {
    return (
      <div className={`bg-white border border-kalos-border rounded-lg shadow-sm animate-pulse ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-kalos-border h-12 w-12"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-kalos-border rounded w-3/4"></div>
            <div className="h-3 bg-kalos-border rounded w-1/2"></div>
          </div>
        </div>
        {!compact && showStatsSummary && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="h-8 bg-kalos-border rounded"></div>
            <div className="h-8 bg-kalos-border rounded"></div>
            <div className="h-8 bg-kalos-border rounded"></div>
          </div>
        )}
      </div>
    );
  }

  // --- No Data State ---
  if (!profile) {
    return (
      <div className={`bg-white border border-kalos-border rounded-lg shadow-sm text-center text-kalos-muted ${compact ? 'p-4' : 'p-6'}`}>
        Could not load profile data.
      </div>
    );
  }

  // --- Extract Data ---
  const { name, email, image, role, createdAt } = profile;
  
  // Use progress store data instead of manual calculation
  const currentLevel = progress?.level?.current ?? 1;
  const levelProgress = progress?.level?.progress ?? 0; // This is already a percentage
  const xpToNext = progress?.level?.xpToNextLevel ?? 0;
  
  // Real stats from progress store
  const achievementCount = achievements?.unlockedCount ?? 0;
  const totalAchievements = achievements?.totalCount ?? 0;
  
  // TODO: These will come from proper API calls later
  const streakDays = 0; // Will come from task statistics
  const completedWorkouts = 0; // Will come from workout history

  const joinDate = createdAt ? new Date(createdAt) : new Date();
  const memberSince = formatDistanceToNowStrict(joinDate, { addSuffix: true });
  const getRoleDisplayName = (role?: string) => role || 'Member';

  // --- Compact Version ---
  if (compact) {
    return (
      <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-3">
          {image ? (
            <Image src={image} alt={name || 'User'} width={40} height={40} className="rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-kalos-bg flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-kalos-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-kalos-text truncate">{name || 'Kalos User'}</h3>
            <p className="text-xs text-kalos-muted">{getRoleDisplayName(role)}</p>
          </div>
          <div className="flex-shrink-0">
            <ProgressRing 
              value={levelProgress} 
              size={36} 
              thickness={3} 
              showPercentage={false}
              label={`${currentLevel}`}
              color={colors.statusPrimary}
              labelSize="sm"
            />
          </div>
        </div>
      </div>
    );
  }

  // --- Full Version ---
  return (
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        {/* Avatar */}
        <div className="mr-5 flex-shrink-0">
          {image ? (
            <Image src={image} alt={name || 'User'} width={72} height={72} className="rounded-full" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-kalos-bg flex items-center justify-center">
              <UserCircle className="w-14 h-14 text-kalos-muted" />
            </div>
          )}
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          {/* Name and Level Ring */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-kalos-text truncate">{name || 'Kalos User'}</h2>
            <div className="flex-shrink-0 ml-4">
              <ProgressRing 
                value={levelProgress} 
                size={48} 
                thickness={4} 
                showPercentage={false}
                label={
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-kalos-muted -mt-1">LVL</span>
                    <span className="text-md font-medium -mt-1">{currentLevel}</span>
                  </div>
                }
                color={colors.statusPrimary}
              />
            </div>
          </div>
          
          {/* Role and Join Date */}
          <div className="mt-1 flex flex-wrap items-center text-sm text-kalos-muted">
            <span>{getRoleDisplayName(role)}</span>
            <span className="mx-2">•</span>
            <span>Member {memberSince}</span>
          </div>
          
          {/* XP to next level */}
          {xpToNext > 0 && (
            <div className="mt-2 text-xs text-kalos-muted">
              {xpToNext} XP to level {currentLevel + 1}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary using StatCard */}
      {showStatsSummary && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard
            title="Achievements"
            value={`${achievementCount}/${totalAchievements}`}
            size="sm"
            variant="default"
          />
          <StatCard
            title="Day Streak"
            value={streakDays}
            size="sm"
            variant="default"
          />
          <StatCard
            title="Workouts"
            value={completedWorkouts}
            size="sm"
            variant="default"
          />
        </div>
      )}

      {/* Actions Section */}
      {showActions && (
        <div className="mt-6 border-t border-kalos-border pt-4">
          <div className="flex justify-end">
            <Link href="/profile" className="flex items-center text-sm text-kalos-text hover:text-kalos-darkText">
              <span>View Full Profile</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;