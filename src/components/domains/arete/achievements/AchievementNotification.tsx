'use client';

import { useState, useEffect } from 'react';
import { AchievementWithStatus } from '@/store/achievements';

interface AchievementNotificationProps {
  achievements: AchievementWithStatus[];
  onDismiss: () => void;
  onViewTrophyRoom?: () => void;
}

export default function AchievementNotification({ 
  achievements, 
  onDismiss, 
  onViewTrophyRoom 
}: AchievementNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Show notification when achievements are provided
  useEffect(() => {
    if (achievements.length > 0) {
      setCurrentIndex(0);
      setIsVisible(true);
    }
  }, [achievements]);

  // Auto-dismiss after 5 seconds if only one achievement
  useEffect(() => {
    if (achievements.length === 1 && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements.length, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for exit animation
  };

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleViewTrophyRoom = () => {
    handleDismiss();
    if (onViewTrophyRoom) onViewTrophyRoom();
  };

  if (achievements.length === 0 || !isVisible) return null;

  const currentAchievement = achievements[currentIndex];
  const isMultiple = achievements.length > 1;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />

      {/* Notification modal */}
      <div className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
        transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }
      `}>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mb-4 shadow-lg">
              <span className="text-4xl animate-bounce">🏆</span>
            </div>
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">
              Achievement Unlocked!
            </h2>
            {isMultiple && (
              <p className="text-yellow-700 text-sm">
                {currentIndex + 1} of {achievements.length}
              </p>
            )}
          </div>

          {/* Achievement details */}
          <div className="text-center space-y-4">
            <div className="bg-white/50 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-xl font-bold text-yellow-900 mb-2">
                {currentAchievement.title}
              </h3>
              <p className="text-yellow-700 text-sm leading-relaxed">
                {currentAchievement.description}
              </p>
              
              {/* Type and XP */}
              <div className="flex items-center justify-center space-x-4 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800 border border-yellow-300">
                  {currentAchievement.type}
                </span>
                <span className="text-yellow-800 font-medium text-sm">
                  +{currentAchievement.xpReward} XP
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center space-x-3 mt-6">
            {isMultiple && currentIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-yellow-700 hover:text-yellow-800 transition-colors"
              >
                ← Previous
              </button>
            )}

            {isMultiple && currentIndex < achievements.length - 1 ? (
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md"
              >
                Next →
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-yellow-700 hover:text-yellow-800 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleViewTrophyRoom}
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-amber-700 transition-all shadow-md"
                >
                  View Trophy Room
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-yellow-600 hover:text-yellow-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}