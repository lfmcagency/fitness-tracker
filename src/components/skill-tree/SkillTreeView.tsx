'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, Lock, CheckCircle2 } from 'lucide-react';
import { CategoryNode } from './CategoryNode';
import { ProgressionNode } from './ProgressionNode';
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
  xpValue: number;
  unlocked?: boolean;
}

interface Category {
  name: string;
  subcategories: {
    [key: string]: Exercise[];
  };
  expanded: boolean;
}

const SkillTreeView: React.FC = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<{[key: string]: Category}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For the selected node detail view
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        // Fetch all exercises
        const response = await fetch('/api/exercises');
        const data = await response.json();

        if (data.success) {
          // Process and organize exercises by category and subcategory
          const exercisesByCategory: {[key: string]: Category} = {};
          
          data.data.forEach((exercise: Exercise) => {
            // For display purposes, mark some exercises as unlocked
            exercise.unlocked = exercise.progressionLevel <= 2;
            
            const { category, subcategory } = exercise;
            
            // Create category if it doesn't exist
            if (!exercisesByCategory[category]) {
              exercisesByCategory[category] = {
                name: category,
                subcategories: {},
                expanded: category === 'core' // Start with core expanded
              };
            }
            
            // Create subcategory if it doesn't exist
            if (!exercisesByCategory[category].subcategories[subcategory || 'uncategorized']) {
              exercisesByCategory[category].subcategories[subcategory || 'uncategorized'] = [];
            }
            
            // Add exercise to subcategory
            exercisesByCategory[category].subcategories[subcategory || 'uncategorized'].push(exercise);
          });
          
          // Sort exercises by progression level within each subcategory
          Object.keys(exercisesByCategory).forEach(category => {
            Object.keys(exercisesByCategory[category].subcategories).forEach(subcategory => {
              exercisesByCategory[category].subcategories[subcategory].sort(
                (a, b) => a.progressionLevel - b.progressionLevel
              );
            });
          });
          
          setCategories(exercisesByCategory);
        } else {
          throw new Error(data.message || 'Failed to fetch exercises');
        }
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setError('Failed to load skill tree data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchExercises();
  }, []);

  const toggleCategory = (categoryName: string) => {
    setCategories(prev => ({
      ...prev,
      [categoryName]: {
        ...prev[categoryName],
        expanded: !prev[categoryName].expanded
      }
    }));
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const closeExerciseDetail = () => {
    setSelectedExercise(null);
  };

  const navigateToExercise = (exerciseId: string) => {
    router.push(`/exercises/${exerciseId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading skill tree...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Main categories to ensure consistent order
  const mainCategories = ['core', 'push', 'pull', 'legs'];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Exercise Progression Skill Tree</h1>
      
      <div className="space-y-6">
        {/* Display main categories in order */}
        {mainCategories.map(categoryName => {
          const category = categories[categoryName];
          if (!category) return null;
          
          return (
            <CategoryNode 
              key={categoryName}
              name={categoryName}
              expanded={category.expanded}
              onToggle={() => toggleCategory(categoryName)}
            >
              {Object.keys(category.subcategories).map(subcategoryName => (
                <div key={subcategoryName} className="ml-4">
                  <h3 className="text-md font-medium mb-2 capitalize">{subcategoryName}</h3>
                  <div className="ml-4 space-y-2">
                    {category.subcategories[subcategoryName].map((exercise) => (
                      <ProgressionNode 
                        key={exercise._id}
                        exercise={exercise}
                        onClick={() => handleExerciseSelect(exercise)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CategoryNode>
          );
        })}
      </div>
      
      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium">{selectedExercise.name}</h3>
              <button onClick={closeExerciseDetail} className="text-gray-500">×</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Category:</span>
                <p className="capitalize">{selectedExercise.category} / {selectedExercise.subcategory}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Difficulty:</span>
                <p className="capitalize">{selectedExercise.difficulty}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Progression Level:</span>
                <p>{selectedExercise.progressionLevel}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">XP Value:</span>
                <p>{selectedExercise.xpValue} XP</p>
              </div>
              
              {selectedExercise.description && (
                <div>
                  <span className="text-sm text-gray-500">Description:</span>
                  <p>{selectedExercise.description}</p>
                </div>
              )}
              
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => navigateToExercise(selectedExercise._id)}
                  className={`px-4 py-2 rounded-md ${
                    selectedExercise.unlocked 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={!selectedExercise.unlocked}
                >
                  {selectedExercise.unlocked ? "View Exercise" : "Locked"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillTreeView;