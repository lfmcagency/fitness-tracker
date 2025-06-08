// src/components/domains/arete/categories/CategoryCard.tsx
'use client';

import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { CategoryProgressData } from '@/types/api/progressResponses';

interface CategoryCardProps {
  category: 'core' | 'push' | 'pull' | 'legs';
  name: string;
  icon: string;
  color: string;
  data: CategoryProgressData;
}

export default function CategoryCard({ category, name, icon, color, data }: CategoryCardProps) {
  // Calculate progress to next level (rough estimate)
  const baseXpForLevel = (level: number) => Math.ceil(Math.pow(level, 1.25) * 100);
  const currentLevelXp = baseXpForLevel(data.level - 1);
  const nextLevelXp = baseXpForLevel(data.level);
  const progressInLevel = Math.max(0, data.xp - currentLevelXp);
  const xpNeededForLevel = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min(100, (progressInLevel / xpNeededForLevel) * 100);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="text-center space-y-3">
        {/* Icon and Level */}
        <div className="relative mx-auto w-16 h-16">
          <ProgressRing
            progress={progressPercent}
            size={64}
            color="blue"
            className="w-16 h-16"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-bold text-gray-600">{data.level}</span>
          </div>
        </div>

        {/* Category Name */}
        <div>
          <h4 className="font-medium text-gray-900 text-sm">{name}</h4>
          <p className="text-xs text-gray-500">{data.xp.toLocaleString()} XP</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${color} transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Level Progress Text */}
        <p className="text-xs text-gray-500">
          {Math.round(progressPercent)}% to Level {data.level + 1}
        </p>
      </div>
    </Card>
  );
}