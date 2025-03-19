'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { UserCircle, Settings, ChevronRight, Award } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { colors } from '@/lib/colors';
import { ProgressRing } from '@/components/shared';

interface ProfileCardProps {
  userId?: string; // If not provided, uses currently authenticated user
  compact?: boolean; // For displaying a compact version when needed
  showActions?: boolean; // Whether to show action links
  showStats?: boolean; // Whether to show stats section
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  userId,
  compact = false,
  showActions = true,
  showStats = true,
}) => {
  const { user } = useAuth();
  
  // If no user data available, show loading state
  if (!user) {
    return (
      <div className={`bg-white border border-kalos-border rounded-lg shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-kalos-border h-12 w-12"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-kalos-border rounded w-3/4"></div>
              <div className="h-3 bg-kalos-border rounded w-1/2"></div>
            </div>
          </div>
          {!compact && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="h-8 bg-kalos-border rounded"></div>
              <div className="h-8 bg-kalos-border rounded"></div>
              <div className="h-8 bg-kalos-border rounded"></div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Mock profile data - in real implementation, these would come from user object
  // or additional API calls
  const profileData = {
    level: 7,
    xp: 730,
    xpToNextLevel: 1000,
    joinDate: new Date('2023-10-25'),
    streakDays: 15,
    completedWorkouts: 42,
    completedTasks: 78,
  };
  
  // Format join date
  const formattedJoinDate = format(profileData.joinDate, 'MMMM d, yyyy');
  
  // Calculate XP percentage for progress ring
  const xpPercentage = (profileData.xp / profileData.xpToNextLevel) * 100;
  
  // Get the role display name
  const getRoleDisplayName = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'trainer':
        return 'Trainer';
      default:
        return 'Member';
    }
  };
  
  // Render the compact version
  if (compact) {
    return (
      <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-kalos-bg flex items-center justify-center">
              <UserCircle className="w-8 h-8 text-kalos-muted" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-kalos-text truncate">{user.name}</h3>
            <p className="text-xs text-kalos-muted">{getRoleDisplayName(user.role)}</p>
          </div>
          
          <div className="flex-shrink-0">
            <ProgressRing
              value={xpPercentage}
              size={36}
              thickness={3}
              showPercentage={false}
              label={`${profileData.level}`}
              color={colors.statusPrimary}
              labelSize="sm"
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Render the full version
  return (
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        {/* Avatar section */}
        <div className="mr-5">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={72}
              height={72}
              className="rounded-full"
            />
          ) : (
            <div className="w-18 h-18 rounded-full bg-kalos-bg flex items-center justify-center">
              <UserCircle className="w-14 h-14 text-kalos-muted" />
            </div>
          )}
        </div>
        
        {/* User info section */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-kalos-text">{user.name}</h2>
            
            <div className="flex items-center">
              <ProgressRing
                value={xpPercentage}
                size={48}
                thickness={4}
                showPercentage={false}
                label={
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-kalos-muted -mt-1">LVL</span>
                    <span className="text-md font-medium -mt-1">{profileData.level}</span>
                  </div>
                }
                color={colors.statusPrimary}
              />
            </div>
          </div>
          
          <div className="mt-1 flex items-center text-kalos-muted">
            <span className="text-sm mr-2">{getRoleDisplayName(user.role)}</span>
            <span className="text-xs">• Member since {formattedJoinDate}</span>
          </div>
          
          <div className="mt-2">
            <div className="h-2 w-full bg-kalos-border rounded-full overflow-hidden">
              <div 
                className="h-full" 
                style={{ 
                  width: `${xpPercentage}%`,
                  backgroundColor: colors.statusPrimary
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1 text-kalos-muted">
              <span>{profileData.xp} XP</span>
              <span>{profileData.xpToNextLevel - profileData.xp} XP to Level {profileData.level + 1}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats section */}
      {showStats && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-kalos-bg rounded-md p-3 text-center">
            <div className="text-xl font-medium text-kalos-text">{profileData.streakDays}</div>
            <div className="text-xs text-kalos-muted mt-1">Day Streak</div>
          </div>
          
          <div className="bg-kalos-bg rounded-md p-3 text-center">
            <div className="text-xl font-medium text-kalos-text">{profileData.completedWorkouts}</div>
            <div className="text-xs text-kalos-muted mt-1">Workouts</div>
          </div>
          
          <div className="bg-kalos-bg rounded-md p-3 text-center">
            <div className="text-xl font-medium text-kalos-text">{profileData.completedTasks}</div>
            <div className="text-xs text-kalos-muted mt-1">Tasks</div>
          </div>
        </div>
      )}
      
      {/* Actions section */}
      {showActions && (
        <div className="mt-6">
          <div className="flex justify-between border-t border-kalos-border pt-4">
            <Link
              href="/profile/settings"
              className="flex items-center text-sm text-kalos-text hover:text-kalos-darkText"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>Settings</span>
            </Link>
            
            <Link
              href="/profile/achievements"
              className="flex items-center text-sm text-kalos-text hover:text-kalos-darkText"
            >
              <Award className="w-4 h-4 mr-2" />
              <span>Achievements</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;