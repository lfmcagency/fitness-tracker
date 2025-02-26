'use client'

import React, { useEffect, useState } from 'react';
import { Timer, ChevronRight, ArrowUp, BarChart2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TrainingModule: React.FC = () => {
  const [currentWeight, setCurrentWeight] = useState<string>("75.5");
  const [exercises, setExercises] = useState([
    {
      id: 1,
      name: "Push-ups",
      sets: [
        { reps: 20, completed: false },
        { reps: 18, completed: false },
        { reps: 15, completed: false }
      ],
      lastSession: { maxReps: 18, totalVolume: 65 },
      restTime: 90
    },
    {
      id: 2,
      name: "Pull-ups",
      sets: [
        { reps: 12, completed: false },
        { reps: 10, completed: false },
        { reps: 8, completed: false }
      ],
      lastSession: { maxReps: 10, totalVolume: 30 },
      restTime: 120
    },
    {
      id: 3,
      name: "Squats",
      sets: [
        { reps: 20, completed: false },
        { reps: 18, completed: false },
        { reps: 15, completed: false }
      ],
      lastSession: { maxReps: 18, totalVolume: 65 },
      restTime: 90
    }
  ]);

  const toggleSet = (exerciseId: number, setIndex: number) => {
    setExercises(prevExercises => 
      prevExercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const updatedSets = [...exercise.sets];
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            completed: !updatedSets[setIndex].completed
          };
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      })
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Upper Body Push/Pull</h1>
        <div className="flex items-center space-x-2 text-gray-600">
          <Timer className="h-4 w-4" />
          <span>32:15</span>
        </div>
      </div>

      {/* Current Weight Input */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700">Current Weight (kg)</label>
        <input
          type="number"
          value={currentWeight}
          onChange={(e) => setCurrentWeight(e.target.value)}
          className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          step="0.1"
        />
      </div>

      {/* Exercises */}
      <div className="space-y-4">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{exercise.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Timer className="h-4 w-4" />
                  <span>{exercise.restTime}s rest</span>
                </div>
              </div>

              {/* Progress from last session */}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span>Max: {exercise.lastSession?.maxReps || 0} reps</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                  <span>Volume: {exercise.lastSession?.totalVolume || 0}</span>
                </div>
              </div>
            </div>

            {/* Sets */}
            <div className="divide-y divide-gray-100">
              {exercise.sets.map((set, index) => (
                <div 
                  key={index} 
                  className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleSet(exercise.id, index)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${set.completed 
                        ? "border-green-500 bg-green-50 text-green-500" 
                        : "border-gray-300"}`}>
                      {set.completed && "✓"}
                    </div>
                    <span className="font-medium">Set {index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-medium">{set.reps} reps</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Insight */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>Progress Update</AlertTitle>
        <AlertDescription>
          You're up 2 reps on push-ups compared to last session at similar bodyweight!
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default TrainingModule;