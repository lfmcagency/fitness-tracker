'use client'

import React, { useState, useEffect } from 'react';
import { Timer, ChevronRight, ArrowUp, BarChart2, Info, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

interface ExerciseSet {
  reps: number;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  progressionLevel: number;
  sets: ExerciseSet[];
  lastSession?: {
    maxReps: number;
    totalVolume: number;
  };
  restTime: number;
  xpValue: number;
}

interface WorkoutSession {
  name: string;
  startTime: Date;
  exercises: Exercise[];
  completed: boolean;
}

const EnhancedTrainingModule: React.FC = () => {
  const [currentWeight, setCurrentWeight] = useState<string>("75.5");
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession>({
    name: "Upper Body Push/Pull",
    startTime: new Date(),
    exercises: [],
    completed: false
  });
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [restTime, setRestTime] = useState<number>(60); // Default rest time
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [xpEarned, setXpEarned] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showXpAnimation, setShowXpAnimation] = useState<boolean>(false);

  useEffect(() => {
    // Fetch exercises for the workout
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/exercises?category=push&limit=3');
        const data = await response.json();

        if (data.success) {
          // Transform API data to our Exercise format
          const exercises = data.data.map((ex: any) => ({
            id: ex._id,
            name: ex.name,
            category: ex.category,
            subcategory: ex.subcategory || '',
            progressionLevel: ex.progressionLevel,
            sets: [
              { reps: 12, completed: false },
              { reps: 10, completed: false },
              { reps: 8, completed: false }
            ],
            lastSession: {
              maxReps: 10,
              totalVolume: 30
            },
            restTime: 90,
            xpValue: ex.xpValue || 10
          }));

          setWorkoutSession(prev => ({
            ...prev,
            exercises
          }));
        } else {
          throw new Error(data.message || 'Failed to fetch exercises');
        }
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setError('Failed to load exercises. Using sample data instead.');
        
        // Fallback to sample data
        setWorkoutSession(prev => ({
          ...prev,
          exercises: [
            {
              id: '1',
              name: "Push-ups",
              category: "push",
              subcategory: "horizontal push",
              progressionLevel: 3,
              sets: [
                { reps: 12, completed: false },
                { reps: 10, completed: false },
                { reps: 8, completed: false }
              ],
              lastSession: {
                maxReps: 10,
                totalVolume: 30
              },
              restTime: 90,
              xpValue: 10
            },
            {
              id: '2',
              name: "Dips",
              category: "push",
              subcategory: "vertical push",
              progressionLevel: 2,
              sets: [
                { reps: 8, completed: false },
                { reps: 6, completed: false },
                { reps: 6, completed: false }
              ],
              lastSession: {
                maxReps: 8,
                totalVolume: 20
              },
              restTime: 120,
              xpValue: 15
            }
          ]
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  // Rest timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerActive(false);
    }
    
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const toggleSet = (exerciseId: string, setIndex: number) => {
    setWorkoutSession(prev => ({
      ...prev,
      exercises: prev.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          const updatedSets = [...exercise.sets];
          const wasCompleted = updatedSets[setIndex].completed;
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            completed: !wasCompleted
          };
          
          // Award XP if completing a set (not if uncompleting)
          if (!wasCompleted) {
            const xpForSet = Math.ceil(exercise.xpValue / exercise.sets.length);
            setXpEarned(prev => prev + xpForSet);
            
            // Trigger XP animation
            setShowXpAnimation(true);
            setTimeout(() => setShowXpAnimation(false), 2000);
            
            // Start rest timer
            setRestTime(exercise.restTime);
            setTimeRemaining(exercise.restTime);
            setTimerActive(true);
            
            // Record the XP gain via API
            fetch('/api/progress/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                xp: xpForSet,
                category: exercise.category,
                source: 'workout'
              })
            }).catch(error => {
              console.error('Error recording XP:', error);
            });
          }
          
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      })
    }));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading training module...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg relative">
      {/* XP Animation */}
      {showXpAnimation && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-white px-3 py-1 rounded-full animate-bounce">
          +XP
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{workoutSession.name}</h1>
          <div className="flex items-center space-x-2 text-gray-600">
            <Timer className="h-4 w-4" />
            <span>{formatTime(
              Math.floor((new Date().getTime() - workoutSession.startTime.getTime()) / 1000)
            )}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">XP</span>
            <span className="font-bold text-yellow-500">{xpEarned}</span>
          </div>
          <Link 
            href="/skill-tree" 
            className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
          >
            Skill Tree
          </Link>
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

      {/* Rest Timer (if active) */}
      {timerActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Rest Timer</h3>
              <p className="text-sm text-gray-600">Take a break before your next set</p>
            </div>
            <div className="text-2xl font-bold">{formatTime(timeRemaining)}</div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${(timeRemaining / restTime) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button 
              className="text-sm text-blue-600"
              onClick={() => setTimerActive(false)}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {workoutSession.exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{exercise.name}</h3>
                  <div className="text-xs text-gray-500 capitalize">
                    {exercise.category} / {exercise.subcategory} - Level {exercise.progressionLevel}
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="text-gray-500">
                    <Timer className="h-4 w-4 inline mr-1" />
                    {exercise.restTime}s
                  </div>
                  <div className="text-yellow-500 font-medium">
                    {exercise.xpValue} XP
                  </div>
                </div>
              </div>

              {/* Progress from last session */}
              {exercise.lastSession && (
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <ArrowUp className="h-4 w-4 text-green-500" />
                    <span>Max: {exercise.lastSession.maxReps} reps</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart2 className="h-4 w-4 text-blue-500" />
                    <span>Volume: {exercise.lastSession.totalVolume}</span>
                  </div>
                </div>
              )}
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

      {/* Add Exercise Button */}
      <Link
        href="/skill-tree"
        className="flex items-center justify-center space-x-2 p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400"
      >
        <Plus className="h-5 w-5" />
        <span>Add Exercise</span>
      </Link>

      {/* Performance Insight */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>Progress Update</AlertTitle>
        <AlertDescription>
          You've earned {xpEarned} XP in this workout. Complete all sets to maximize your gains!
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EnhancedTrainingModule;