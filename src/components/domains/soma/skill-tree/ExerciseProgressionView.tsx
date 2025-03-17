'use client'

import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Lock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Exercise {
  _id: string;
  name: string;
  category: string;
  subcategory: string;
  progressionLevel: number;
  description?: string;
  difficulty: string;
  prerequisites?: string[];
  nextProgressions?: string[];
  xpValue: number;
  unlocked?: boolean;
}

interface ExerciseProgressionViewProps {
  exerciseId: string;
}

const ExerciseProgressionView: React.FC<ExerciseProgressionViewProps> = ({ exerciseId }) => {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [previousExercises, setPreviousExercises] = useState<Exercise[]>([]);
  const [nextExercises, setNextExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExerciseWithProgressions = async () => {
      try {
        setLoading(true);
        // Fetch the exercise and related exercises
        const response = await fetch(`/api/exercises/${exerciseId}`);
        const data = await response.json();

        if (data.success) {
          setExercise(data.exercise);
          
          // For demo, let's simulate previous and next exercises
          // In a real implementation, this would come from the API
          const relatedResponse = await fetch(`/api/exercises?category=${data.exercise.category}`);
          const relatedData = await relatedResponse.json();
          
          if (relatedData.success) {
            // Get exercises with lower progression levels
            const previous = relatedData.data
              .filter((ex: Exercise) => 
                ex.subcategory === data.exercise.subcategory && 
                ex.progressionLevel < data.exercise.progressionLevel
              )
              .sort((a: Exercise, b: Exercise) => b.progressionLevel - a.progressionLevel)
              .slice(0, 2);
            
            // Get exercises with higher progression levels
            const next = relatedData.data
              .filter((ex: Exercise) => 
                ex.subcategory === data.exercise.subcategory && 
                ex.progressionLevel > data.exercise.progressionLevel
              )
              .sort((a: Exercise, b: Exercise) => a.progressionLevel - b.progressionLevel)
              .slice(0, 2);
            
            // Add unlocked property for demonstration
            previous.forEach((ex: Exercise) => { ex.unlocked = true; });
            next.forEach((ex: Exercise, index: number) => { 
              ex.unlocked = index === 0; // Only first next progression is unlocked
            });
            
            setPreviousExercises(previous);
            setNextExercises(next);
          }
        } else {
          throw new Error(data.message || 'Failed to fetch exercise details');
        }
      } catch (error) {
        console.error('Error fetching exercise progression:', error);
        setError('Failed to load exercise progression data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (exerciseId) {
      fetchExerciseWithProgressions();
    }
  }, [exerciseId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading exercise progression...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!exercise) {
    return (
      <Alert className="my-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Exercise not found. Please select a different exercise.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Exercise Progression Path</h1>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Exercise Card */}
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{exercise.name}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Level {exercise.progressionLevel}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm text-gray-500">Category:</span>
              <p className="capitalize">{exercise.category} / {exercise.subcategory}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">Difficulty:</span>
              <p className="capitalize">{exercise.difficulty}</p>
            </div>
            
            <div>
              <span className="text-sm text-gray-500">XP Value:</span>
              <p>{exercise.xpValue} XP</p>
            </div>
          </div>
          
          {exercise.description && (
            <div className="mt-4">
              <span className="text-sm text-gray-500">Description:</span>
              <p className="mt-1">{exercise.description}</p>
            </div>
          )}
        </div>
        
        {/* Progression Path Visualization */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Progression Path</h3>
          
          <div className="flex flex-col items-center space-y-6">
            {/* Previous Exercises */}
            {previousExercises.length > 0 && (
              <div className="w-full space-y-2">
                <h4 className="text-sm font-medium text-gray-500">Previous Progressions</h4>
                {previousExercises.map((ex) => (
                  <div key={ex._id} className="flex items-center p-4 border rounded-lg bg-gray-50">
                    <CheckCircle2 size={20} className="text-green-500 mr-3" />
                    <div>
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-sm text-gray-500">Level {ex.progressionLevel} - {ex.difficulty}</div>
                    </div>
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Completed</span>
                  </div>
                ))}
                <div className="flex justify-center my-2">
                  <ArrowRight size={24} className="text-gray-400" />
                </div>
              </div>
            )}
            
            {/* Current Exercise */}
            <div className="w-full">
              <h4 className="text-sm font-medium text-gray-500">Current</h4>
              <div className="flex items-center p-4 border rounded-lg bg-blue-50 border-blue-200">
                <CheckCircle2 size={20} className="text-blue-500 mr-3" />
                <div>
                  <div className="font-medium">{exercise.name}</div>
                  <div className="text-sm text-gray-500">Level {exercise.progressionLevel} - {exercise.difficulty}</div>
                </div>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">Current</span>
              </div>
              {nextExercises.length > 0 && (
                <div className="flex justify-center my-2">
                  <ArrowRight size={24} className="text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Next Exercises */}
            {nextExercises.length > 0 && (
              <div className="w-full space-y-2">
                <h4 className="text-sm font-medium text-gray-500">Next Progressions</h4>
                {nextExercises.map((ex) => (
                  <div 
                    key={ex._id} 
                    className={`flex items-center p-4 border rounded-lg ${
                      ex.unlocked ? "bg-white" : "bg-gray-50 opacity-70"
                    }`}
                  >
                    {ex.unlocked ? (
                      <CheckCircle2 size={20} className="text-gray-300 mr-3" />
                    ) : (
                      <Lock size={20} className="text-gray-400 mr-3" />
                    )}
                    <div>
                      <div className={`font-medium ${!ex.unlocked && "text-gray-500"}`}>{ex.name}</div>
                      <div className="text-sm text-gray-500">Level {ex.progressionLevel} - {ex.difficulty}</div>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                      ex.unlocked 
                        ? "bg-yellow-100 text-yellow-800" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {ex.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Unlock Requirements for Next Progression */}
        {nextExercises.length > 0 && !nextExercises[0].unlocked && (
          <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <h3 className="font-medium mb-2">Unlock Requirements</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Complete {exercise.name} with perfect form for 3 sets of 8-12 reps</li>
              <li>Earn 100 XP in the {exercise.subcategory} progression path</li>
              <li>Track your progress for at least 2 weeks</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseProgressionView;