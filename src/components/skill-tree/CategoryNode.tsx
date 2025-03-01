import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface CategoryNodeProps {
  name: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CategoryNode: React.FC<CategoryNodeProps> = ({ 
  name, 
  expanded, 
  onToggle, 
  children 
}) => {
  return (
    <div className="border rounded-lg overflow-hidden mb-4">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer"
        onClick={onToggle}
      >
        <h2 className="text-lg font-medium capitalize">{name} Exercises</h2>
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </div>
      
      {expanded && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};