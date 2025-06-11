// src/components/domains/trophe/MealTimeBlock.tsx
'use client'

import { useState } from 'react'
import { TimeBlockContainer } from '@/components/shared/TimeBlockContainer'
import { MealData } from '@/types/api/mealResponses'
import { MealCard } from './MealCard'
import { MealCreator } from './MealCreator'
import { MealEditor } from './MealEditor'

type TimeBlockType = 'morning' | 'afternoon' | 'evening'

interface MealTimeBlockProps {
  timeBlock: TimeBlockType
  title: string
  timeRange: string
  meals: MealData[]
  selectedDate: string
  isLoading: boolean
}

export function MealTimeBlock({
  timeBlock,
  title,
  timeRange,
  meals,
  selectedDate,
  isLoading
}: MealTimeBlockProps) {
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Handle creating a new meal
  const handleCreateMeal = () => {
    setIsCreating(true)
    setEditingMealId(null) // Close any editing
  }

  // Handle editing an existing meal
  const handleEditMeal = (mealId: string) => {
    setEditingMealId(mealId)
    setIsCreating(false) // Close creation
  }

  // Cancel creation or editing
  const handleCancel = () => {
    setIsCreating(false)
    setEditingMealId(null)
  }

  // Handle successful meal creation
  const handleMealCreated = () => {
    setIsCreating(false)
  }

  // Handle successful meal update
  const handleMealUpdated = () => {
    setEditingMealId(null)
  }

  const isEmpty = meals.length === 0 && !isCreating

  return (
    <TimeBlockContainer
      title={title}
      timeRange={timeRange}
      showAddButton={!isCreating}
      onAdd={handleCreateMeal}
      isEmpty={isEmpty}
      emptyContent={
        <div className="text-center py-6">
          <p className="text-gray-500 mb-2">No meals logged for {title.toLowerCase()}</p>
          <button
            onClick={handleCreateMeal}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first meal
          </button>
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full"></div>
          <span className="ml-2 text-gray-600">Loading meals...</span>
        </div>
      )}

      {/* Show creation component at the top when creating */}
      {isCreating && (
        <MealCreator
          timeBlock={timeBlock}
          selectedDate={selectedDate}
          onSave={handleMealCreated}
          onCancel={handleCancel}
        />
      )}

      {/* Render existing meals */}
      {meals.map((meal) => {
        // Show editor if this meal is being edited
        if (editingMealId === meal.id) {
          return (
            <MealEditor
              key={meal.id}
              meal={meal}
              onSave={handleMealUpdated}
              onCancel={handleCancel}
            />
          )
        }

        // Otherwise show the display card
        return (
          <MealCard
            key={meal.id}
            meal={meal}
            onEdit={() => handleEditMeal(meal.id)}
          />
        )
      })}
    </TimeBlockContainer>
  )
}