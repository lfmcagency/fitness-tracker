'use client'

import React, { useState, useEffect } from 'react';
import { Award, Dumbbell, Trophy, Zap, BarChart2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CategoryProgress {
  level: number;
  xp: number;
}

interface UserProgress {
  globalLevel: number;
  globalXp: number;
  categoryProgress: {
    core: CategoryProgress;
    push: CategoryProgress;
    pull: CategoryProgress;
    legs: CategoryProgress;
  };
  achievements: any[];
}

const UserProgressOverview: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/progress/user');
        const data = await response.json();

        if (data.success) {
          setProgress(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch user progress');
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
        setError('Failed to load progress data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProgress();
  }, []);

  // Calculate XP needed for next level
  const calculateNextLevelXp = (currentLevel: number) => {
    // Using the same formula as in the API: level = 1 + floor(globalXp / 100)^0.8
    // We need to solve for XP: globalXp = 100 * (level - 1)^(1/0.8)
    return Math.ceil(100 * Math.pow(currentLevel, 1/0.8));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading progress data...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!progress) {
    return <div>No progress data available.</div>;
  }

  const xpForNextLevel = calculateNextLevelXp(progress.globalLevel);
  const xpProgress = (progress.globalXp / xpForNextLevel) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="flex items-center mb-6">
        <div className="relative flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
          <span className="text-2xl font-bold text-blue-800">{progress.globalLevel}</span>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Profile</h1>
          <p className="text-gray-600">Level {progress.globalLevel} Fitness Athlete</p>
        </div>
      </div>
      
      {/* XP Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Level Progress</span>
          <span className="text-sm text-gray-500">{progress.globalXp} / {xpForNextLevel} XP</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          ></div>
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">
          {Math.ceil(xpForNextLevel - progress.globalXp)} XP needed for Level {progress.globalLevel + 1}
        </div>
      </div>
      
      {/* Category Progress */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">Movement Category Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(progress.categoryProgress).map(([category, catProgress]) => (
            <div key={category} className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Dumbbell className="text-blue-500 mr-2" size={18} />
                <h3 className="font-medium capitalize">{category}</h3>
                <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  Lvl {catProgress.level}
                </span>
              </div>
              <div className="mb-1 flex justify-between text-xs">
                <span>XP: {catProgress.xp}</span>
                <span>{Math.ceil(50 * Math.pow(catProgress.level, 1/0.7))} for next level</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full">
                <div 
                  className="h-full bg-blue-600 rounded-full"
                  style={{ 
                    width: `${Math.min(
                      (catProgress.xp / (50 * Math.pow(catProgress.level, 1/0.7))) * 100, 
                      100
                    )}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <div className="border rounded-lg divide-y">
          {/* Sample activity items */}
          <div className="p-4 flex items-start">
            <Award className="text-green-500 mr-3 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Completed 3 sets of Push-ups</p>
              <p className="text-sm text-gray-500">+15 XP earned in Push category</p>
              <p className="text-xs text-gray-400">Today, 10:30 AM</p>
            </div>
          </div>
          <div className="p-4 flex items-start">
            <Trophy className="text-yellow-500 mr-3 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Achievement Unlocked: 20+ Push-ups</p>
              <p className="text-sm text-gray-500">+50 XP earned</p>
              <p className="text-xs text-gray-400">Yesterday, 4:15 PM</p>
            </div>
          </div>
          <div className="p-4 flex items-start">
            <BarChart2 className="text-blue-500 mr-3 mt-0.5" size={18} />
            <div>
              <p className="font-medium">Reached Level 2 in Core Exercises</p>
              <p className="text-sm text-gray-500">Unlocked new progression path</p>
              <p className="text-xs text-gray-400">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Achievements */}
      <div>
        <h2 className="text-lg font-medium mb-4">Achievements</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Sample achievements */}
          <div className="border rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-2">
              <Trophy className="text-yellow-500" size={24} />
            </div>
            <h3 className="font-medium text-sm">First Workout</h3>
            <p className="text-xs text-gray-500">Completed your first workout</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Dumbbell className="text-green-500" size={24} />
            </div>
            <h3 className="font-medium text-sm">Strength Seeker</h3>
            <p className="text-xs text-gray-500">Complete 10 push exercises</p>
          </div>
          <div className="border rounded-lg p-4 text-center bg-gray-50 opacity-60">
            <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <Zap className="text-gray-400" size={24} />
            </div>
            <h3 className="font-medium text-sm">Consistent Athlete</h3>
            <p className="text-xs text-gray-500">Workout 5 days in a row</p>
          </div>
          <div className="border rounded-lg p-4 text-center bg-gray-50 opacity-60">
            <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <Award className="text-gray-400" size={24} />
            </div>
            <h3 className="font-medium text-sm">Core Master</h3>
            <p className="text-xs text-gray-500">Reach level 5 in Core</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProgressOverview;