'use client';

import { useProgressStore } from '@/store/progress';

export default function RecentAchievements() {
  const { achievements } = useProgressStore();

  // Loading state
  if (achievements.isLoading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Achievements</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (achievements.error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Achievements</h3>
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
      </div>
    );
  }

  // Get unlocked achievements (recent first - taking first few as "recent")
  const unlockedAchievements = achievements.data?.list?.filter(a => a.unlocked) || [];
  const recentAchievements = unlockedAchievements.slice(0, 6); // Show up to 6 recent

  // Type color mapping
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'strength': return 'bg-red-100 text-red-700 border-red-200';
      case 'consistency': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'nutrition': return 'bg-green-100 text-green-700 border-green-200';
      case 'milestone': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent Achievements</h3>
        {achievements.data && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {achievements.data.unlockedCount} / {achievements.data.totalCount} unlocked
            </span>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </button>
          </div>
        )}
      </div>

      {recentAchievements.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-gray-500 font-medium">No achievements unlocked yet</p>
          <p className="text-gray-400 text-sm mt-1">Keep training to earn your first achievement!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                {/* Achievement Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">{achievement.icon || '🏆'}</span>
                  </div>
                </div>
                
                {/* Achievement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {achievement.title}
                    </h4>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {achievement.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(achievement.type)}`}>
                      {achievement.type}
                    </span>
                    
                    <span className="text-xs text-gray-500">
                      +{achievement.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}