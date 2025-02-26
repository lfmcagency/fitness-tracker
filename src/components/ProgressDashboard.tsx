'use client'

import React, { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, ArrowUp, ArrowDown, Calendar, Dumbbell, Scale, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProgressStore } from '@/store/progress';

const ProgressDashboard = () => {
  const { 
    performanceData, 
    achievements, 
    currentWeight,
    weightChange,
    maxPushups,
    pushupChange,
    trainingDays,
    isLoading, 
    error, 
    fetchProgressData 
  } = useProgressStore();

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  if (isLoading) {
    return <div className="text-center py-8">Loading progress data...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Progress Dashboard</h1>
        <p className="text-gray-600">Last 7 days overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 text-gray-600 mb-2">
            <Scale className="h-5 w-5" />
            <span className="font-medium">Current Weight</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{currentWeight}</span>
            <span className="text-sm text-gray-600">kg</span>
            <span className="text-sm text-green-600 flex items-center">
              <ArrowDown className="h-4 w-4" />
              {Math.abs(weightChange)}kg
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 text-gray-600 mb-2">
            <Dumbbell className="h-5 w-5" />
            <span className="font-medium">Max Push-ups</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{maxPushups}</span>
            <span className="text-sm text-gray-600">reps</span>
            <span className="text-sm text-green-600 flex items-center">
              <ArrowUp className="h-4 w-4" />
              {pushupChange} reps
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-2 text-gray-600 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Training Days</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{trainingDays}/7</span>
            <span className="text-sm text-gray-600">days</span>
            <span className="text-sm text-blue-600">on track</span>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="font-medium mb-4">Strength Progress vs Weight</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="pushups" 
                stroke="#2563eb" 
                name="Push-ups"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="pullups" 
                stroke="#16a34a" 
                name="Pull-ups"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="weight" 
                stroke="#dc2626" 
                name="Weight (kg)"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium">Recent Achievements</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className={`h-5 w-5 ${
                  achievement.type === "strength" ? "text-blue-500" : "text-green-500"
                }`} />
                <span className="font-medium">{achievement.title}</span>
              </div>
              <span className="text-sm text-gray-600">{achievement.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>Training Insight</AlertTitle>
        <AlertDescription>
          Your push-up performance has improved consistently as your weight decreased. 
          Consider maintaining current weight for optimal strength-to-weight ratio.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ProgressDashboard;