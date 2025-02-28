import React from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';

interface Exercise {
  _id: string;
  name: string;
  progressionLevel: number;
  difficulty: string;
  unlocked?: boolean;
}

interface ProgressionNodeProps {
  exercise: Exercise;
  onClick: () => void;
}

export const ProgressionNode: React.FC<ProgressionNodeProps> = ({ 
  exercise, 
  onClick 
}) => {
  return (
    <div 
      className={`flex items-center p-2 rounded-md cursor-pointer ${
        exercise.unlocked ? "hover:bg-blue-50" : "hover:bg-gray-50 opacity-70"
      }`}
      onClick={onClick}
    >
      {exercise.unlocked ? (
        <CheckCircle2 size={18} className="text-green-500 mr-2" />
      ) : (
        <Lock size={18} className="text-gray-400 mr-2" />
      )}
      <span className={`${exercise.unlocked ? "font-medium" : "text-gray-500"}`}>
        {exercise.name} (Level {exercise.progressionLevel})
      </span>
      <span className="ml-auto text-xs px-2 py-1 rounded-full bg-gray-100">
        {exercise.difficulty}
      </span>
    </div>
  );
};