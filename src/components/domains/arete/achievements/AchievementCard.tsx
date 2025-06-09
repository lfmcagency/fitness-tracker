// src/components/domains/arete/achievements/AchievementCard.tsx
'use client';

import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { AchievementData } from '@/types/api/achievementResponses';

interface AchievementCardProps {
  achievement: AchievementData;
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  // Type color mapping
  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'strength': 
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case 'consistency': 
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'nutrition': 
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'milestone': 
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      default: 
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const typeStyle = getTypeStyle(achievement.type);
  const isLocked = !achievement.unlocked;

  return (
    <Card className={`p-4 transition-all ${
      isLocked 
        ? 'opacity-60 bg-gray-50' 
        : 'hover:shadow-md hover:-translate-y-0.5'
    }`}>
      <div className="space-y-3">
        {/* Header with icon and unlock status */}
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isLocked ? 'bg-gray-200' : 'bg-yellow-100'
          }`}>
            <span className="text-xl">
              {isLocked ? '🔒' : achievement.icon || '🏆'}
            </span>
          </div>
          
          {achievement.unlocked && (
            <div className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
              Unlocked
            </div>
          )}
        </div>

        {/* Title and description */}
        <div>
          <h4 className={`font-medium mb-1 ${
            isLocked ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {achievement.title}
          </h4>
          <p className={`text-sm ${
            isLocked ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {achievement.description}
          </p>
        </div>

        {/* Progress bar for locked achievements */}
        {isLocked && achievement.progress !== undefined && achievement.progress > 0 && (

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{achievement.progress || 0}%</span>
            </div>
          <ProgressBar 
          value={achievement.progress || 0} 
          className="h-2"
          color="blue"
          />
          </div>
        )}

        {/* Footer with type and XP */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
            {achievement.type}
          </span>
          
          <div className="text-xs text-gray-500">
            <span className="font-medium">+{achievement.xpReward}</span> XP
          </div>
        </div>
      </div>
    </Card>
  );
}