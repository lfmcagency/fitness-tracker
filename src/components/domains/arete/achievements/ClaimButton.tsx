'use client';

import { useState } from 'react';
import { AchievementWithStatus } from '@/store/achievements';
import { useProgressStore } from '@/store/progress';

interface ClaimButtonProps {
  achievement: AchievementWithStatus;
  onClaim: (achievementId: string) => void;
}

export default function ClaimButton({ achievement, onClaim }: ClaimButtonProps) {
  const [isClaiiming, setClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [claimResult, setClaimResult] = useState<{ xpAwarded?: number; leveledUp?: boolean; newLevel?: number } | null>(null);
  
  // Get progress store to refresh after claim
  const { fetchProgress } = useProgressStore();

  const handleClaim = async () => {
    setClaiming(true);
    
    try {
      const response = await fetch(`/api/achievements/${achievement.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to claim achievement');
      }

      // Store claim result for celebration
      setClaimResult({
        xpAwarded: result.data?.xpAwarded || achievement.xpReward,
        leveledUp: result.data?.leveledUp || false,
        newLevel: result.data?.newLevel,
      });

      // Show celebration
      setShowCelebration(true);
      
      // Call parent callback to update achievement store
      onClaim(achievement.id);
      
      // Refresh progress store to show new level if gained
      await fetchProgress();
      
      // Hide celebration after 3 seconds
      setTimeout(() => {
        setShowCelebration(false);
        setClaimResult(null);
      }, 3000);

    } catch (error) {
      console.error('Failed to claim achievement:', error);
      // TODO: Show error toast
    } finally {
      setClaiming(false);
    }
  };

  // XP celebration overlay
  if (showCelebration && claimResult) {
    return (
      <div className="relative">
        {/* Celebration animation */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
            <div className="text-center">
              <div className="text-2xl mb-1">🎉</div>
              <div className="font-bold text-sm">+{claimResult.xpAwarded} XP!</div>
              {claimResult.leveledUp && (
                <div className="text-xs opacity-90">Level {claimResult.newLevel}!</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Backdrop */}
        <div className="opacity-20">
          <button
            disabled
            className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium"
          >
            Claimed!
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={isClaiiming}
      className={`
        w-full py-2 px-4 rounded-lg font-medium transition-all duration-200
        ${isClaiiming 
          ? 'bg-yellow-400 text-yellow-700 cursor-not-allowed' 
          : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
        }
      `}
    >
      {isClaiiming ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin"></div>
          <span>Claiming...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center space-x-2">
          <span>🏆</span>
          <span>Claim +{achievement.xpReward} XP</span>
        </div>
      )}
    </button>
  );
}