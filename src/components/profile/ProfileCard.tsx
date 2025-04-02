'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserCircle, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { colors } from '@/lib/colors';
import { ProgressRing } from '@/components/shared';
// NO import for calculateLevel or calculateLevelDetails needed here

interface ProfileCardProps {
  compact?: boolean;
  showActions?: boolean;
  showStatsSummary?: boolean;
}

// Helper function moved outside or defined locally
const calculateXpPercentage = (currentXpInLevel: number, xpNeededForLevel: number): number => {
    if (xpNeededForLevel <= 0) return 100; // Avoid division by zero, assume 100% if goal is 0 or less
    const percentage = (currentXpInLevel / xpNeededForLevel) * 100;
    return Math.min(100, Math.max(0, percentage));
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  compact = false,
  showActions = false,
  showStatsSummary = true,
}) => {
  const { profile, isLoadingProfile } = useUserStore(state => ({
    profile: state.profile,
    isLoadingProfile: state.isLoadingProfile
  }));

  // --- Loading Skeleton ---
  if (isLoadingProfile && !profile) {
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
     return ( <div className={`bg-white border border-kalos-border rounded-lg shadow-sm p-6 text-center text-kalos-muted ${compact ? 'p-4' : 'p-6'}`}>Could not load profile data.</div> );
  }

  // --- Extract Data ---
  const { name, email, image, role, stats, createdAt } = profile;
  const currentLevel = stats?.level ?? 1;
  const currentXp = stats?.xp ?? 0;

  // --- Calculate Level Progress ---
  // Replace this placeholder logic with your actual XP system.
  // This example assumes a simple 1000 XP difference per level.
  const xpPerLevel = 1000; // EXAMPLE - MUST MATCH YOUR SYSTEM
  const xpAtStartOfLevel = (currentLevel - 1) * xpPerLevel;
  const xpToReachNextLevel = currentLevel * xpPerLevel;
  const xpInCurrentLevel = currentXp - xpAtStartOfLevel;
  const xpRangeForCurrentLevel = xpToReachNextLevel - xpAtStartOfLevel;
  const xpToNextAbsolute = xpToReachNextLevel - currentXp; // Actual XP points needed
  const xpPercentage = calculateXpPercentage(xpInCurrentLevel, xpRangeForCurrentLevel);

  const joinDate = createdAt ? new Date(createdAt) : new Date();
  const memberSince = formatDistanceToNowStrict(joinDate, { addSuffix: true });
  const getRoleDisplayName = (role?: string) => { return role || 'Member'; };

  // --- MOCK DATA Section ---
  // These stats (streak, workout count, task count) are NOT in profile.stats
  // Use placeholders until this data is fetched from UserProgress or other models.
  const mockStats = {
      streakDays: 0,
      completedWorkouts: 0,
      completedTasks: 0,
  };

  // --- Compact Version JSX ---
  if (compact) {
     return (
       <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-4">
         <div className="flex items-center space-x-3">
           {image ? ( <Image src={image} alt={name || 'User'} width={40} height={40} className="rounded-full" /> )
                  : ( <div className="w-10 h-10 rounded-full bg-kalos-bg flex items-center justify-center"><UserCircle className="w-8 h-8 text-kalos-muted" /></div> )}
           <div className="flex-1 min-w-0">
             <h3 className="text-base font-medium text-kalos-text truncate">{name || 'Kalos User'}</h3>
             <p className="text-xs text-kalos-muted">{getRoleDisplayName(role)}</p>
           </div>
           <div className="flex-shrink-0">
             <ProgressRing value={xpPercentage} size={36} thickness={3} showPercentage={false} label={`${currentLevel}`} color={colors.statusPrimary} labelSize="sm" />
           </div>
         </div>
       </div>
     );
  }

  // --- Full Version JSX ---
  return (
    <div className="bg-white border border-kalos-border rounded-lg shadow-sm p-6">
        <div className="flex items-center">
             {/* Avatar */}
             <div className="mr-5 flex-shrink-0">
                 {image ? ( <Image src={image} alt={name || 'User'} width={72} height={72} className="rounded-full" /> )
                        : ( <div className="w-[72px] h-[72px] rounded-full bg-kalos-bg flex items-center justify-center"><UserCircle className="w-14 h-14 text-kalos-muted" /></div> )}
             </div>
             {/* User Info */}
            <div className="flex-1 min-w-0">
                 {/* Name and Level Ring */}
                 <div className="flex items-center justify-between">
                     <h2 className="text-xl font-medium text-kalos-text truncate">{name || 'Kalos User'}</h2>
                     <div className="flex-shrink-0 ml-4">
                         <ProgressRing value={xpPercentage} size={48} thickness={4} showPercentage={false}
                             label={<div className="flex flex-col items-center"><span className="text-xs text-kalos-muted -mt-1">LVL</span><span className="text-md font-medium -mt-1">{currentLevel}</span></div>}
                             color={colors.statusPrimary}
                         />
                     </div>
                 </div>
                 {/* Role and Join Date */}
                 <div className="mt-1 flex flex-wrap items-center text-sm text-kalos-muted">
                     <span>{getRoleDisplayName(role)}</span><span className="mx-2">•</span><span>Member {memberSince}</span>
                 </div>
                 {/* XP Bar */}
                 <div className="mt-3">
                     <div className="h-2 w-full bg-kalos-bg rounded-full overflow-hidden">
                         <div className="h-full transition-width duration-300" style={{ width: `${xpPercentage}%`, backgroundColor: colors.statusPrimary }} />
                     </div>
                     <div className="flex justify-between text-xs mt-1 text-kalos-muted">
                         <span>{currentXp} XP</span>
                         <span>{xpToNextAbsolute > 0 ? `${xpToNextAbsolute} XP to Lvl ${currentLevel + 1}` : 'Max Level XP'}</span>
                     </div>
                 </div>
             </div>
        </div>
         {/* --- Stats Summary Section uses MOCK data --- */}
         {showStatsSummary && (
             <div className="mt-6 grid grid-cols-3 gap-4">
                 <StatDisplay label="Day Streak" value={mockStats.streakDays} />
                 <StatDisplay label="Workouts" value={mockStats.completedWorkouts} />
                 <StatDisplay label="Tasks Done" value={mockStats.completedTasks} />
             </div>
         )}
         {/* Actions Section (Optional) */}
         {showActions && (
             <div className="mt-6 border-t border-kalos-border pt-4">
                 <div className="flex justify-end">
                     <Link href="/profile" className="flex items-center text-sm text-kalos-text hover:text-kalos-darkText">
                         <span>View Full Profile</span><ChevronRight className="w-4 h-4 ml-1" />
                     </Link>
                 </div>
             </div>
         )}
    </div>
  );
};

const StatDisplay: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-kalos-bg rounded-md p-3 text-center">
        <div className="text-xl font-medium text-kalos-text">{value}</div>
        <div className="text-xs text-kalos-muted mt-1">{label}</div>
    </div>
);

export default ProfileCard;