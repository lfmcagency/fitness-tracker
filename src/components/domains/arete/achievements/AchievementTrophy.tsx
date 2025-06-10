'use client';

import { AchievementWithStatus } from '@/store/achievements';
import ClaimButton from './ClaimButton';

interface AchievementTrophyProps {
  achievement: AchievementWithStatus;
  onClaim?: (achievementId: string) => void;
  onClick?: (achievement: AchievementWithStatus) => void;
}

export default function AchievementTrophy({ achievement, onClaim, onClick }: AchievementTrophyProps) {
  const { status, title, description, type, xpReward, icon, progress } = achievement;

  // Visual state based on achievement status
  const getVisualState = () => {
    switch (status) {
      case 'pending':
        return {
          containerClass: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-lg ring-2 ring-yellow-200/50',
          iconClass: 'text-4xl animate-pulse drop-shadow-lg',
          iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
          titleClass: 'text-yellow-900 font-bold',
          descClass: 'text-yellow-700',
          overlayClass: 'absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg blur opacity-25 animate-pulse',
        };
      
      case 'claimed':
        return {
          containerClass: 'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow',
          iconClass: 'text-4xl',
          iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
          titleClass: 'text-gray-900 font-semibold',
          descClass: 'text-gray-600',
          overlayClass: '',
        };
      
      case 'locked':
      default:
        return {
          containerClass: 'bg-gray-50 border border-gray-200 opacity-60',
          iconClass: 'text-4xl grayscale',
          iconBg: 'bg-gray-300',
          titleClass: 'text-gray-500',
          descClass: 'text-gray-400',
          overlayClass: '',
        };
    }
  };

  const visual = getVisualState();

  // Type badge color
  const getTypeBadgeColor = (achievementType: string) => {
    switch (achievementType) {
      case 'strength': return 'bg-red-100 text-red-700 border-red-200';
      case 'consistency': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'nutrition': return 'bg-green-100 text-green-700 border-green-200';
      case 'milestone': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleClick = () => {
    if (onClick) onClick(achievement);
  };

  return (
    <div className="relative group">
      {/* Glow effect for pending achievements */}
      {visual.overlayClass && <div className={visual.overlayClass}></div>}
      
      {/* Main trophy card */}
      <div 
        className={`relative p-6 rounded-lg cursor-pointer transition-all duration-300 ${visual.containerClass}`}
        onClick={handleClick}
      >
        {/* Trophy icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 ${visual.iconBg} rounded-full flex items-center justify-center shadow-lg`}>
            <span className={visual.iconClass}>
              {icon || '🏆'}
            </span>
          </div>
        </div>

        {/* Achievement details */}
        <div className="text-center space-y-3">
          {/* Title */}
          <h4 className={`text-lg ${visual.titleClass} leading-tight`}>
            {title}
          </h4>
          
          {/* Description */}
          <p className={`text-sm ${visual.descClass} line-clamp-3 leading-relaxed`}>
            {description}
          </p>

          {/* Progress bar for locked achievements */}
          {status === 'locked' && typeof progress === 'number' && progress > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
            </div>
          )}

          {/* Bottom row: type badge + XP + claim button */}
          <div className="flex items-center justify-between mt-4">
            {/* Type badge */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadgeColor(type)}`}>
              {type}
            </span>
            
            {/* XP reward */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">
                +{xpReward} XP
              </span>
            </div>
          </div>

          {/* Claim button for pending achievements */}
          {status === 'pending' && onClaim && (
            <div className="mt-4">
              <ClaimButton 
                achievement={achievement} 
                onClaim={onClaim}
              />
            </div>
          )}

          {/* Claimed checkmark */}
          {status === 'claimed' && (
            <div className="absolute top-3 right-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}