// src/components/domains/arete/categories/CategoryGrid.tsx
'use client';

import { useProgressStore } from '@/store/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CategoryCard from './CategoryCard';

export default function CategoryGrid() {
  const { categoryProgress, fetchCategoryProgress } = useProgressStore();

  // Loading state
  if (categoryProgress.isLoading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Category Progress</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (categoryProgress.error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Category Progress</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCategoryProgress}
          >
            Retry
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">Failed to load categories</p>
          <p className="text-gray-500 text-sm mt-1">{categoryProgress.error}</p>
        </div>
      </Card>
    );
  }

  // No data state
  if (!categoryProgress.data) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Category Progress</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No category data available</p>
        </div>
      </Card>
    );
  }

  const categories = [
    { key: 'core', name: 'Core', icon: '🔥', color: 'bg-blue-500' },
    { key: 'push', name: 'Push', icon: '💪', color: 'bg-red-500' },
    { key: 'pull', name: 'Pull', icon: '🎯', color: 'bg-green-500' },
    { key: 'legs', name: 'Legs', icon: '🦵', color: 'bg-purple-500' },
  ] as const;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">Category Progress</h3>
        <Button variant="ghost" size="sm">
          View Skill Tree
        </Button>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.key}
            category={category.key}
            name={category.name}
            icon={category.icon}
            color={category.color}
            data={categoryProgress.data![category.key]}
          />
        ))}
      </div>
    </Card>
  );
}