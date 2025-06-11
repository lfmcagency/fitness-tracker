// src/components/domains/trophe/MealCard.tsx
'use client'

import { Edit, Trash2, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MealData } from '@/types/api/mealResponses'
import { useNutritionStore } from '@/store/nutrition'

interface MealCardProps {
  meal: MealData
  onEdit: () => void
}

export function MealCard({ meal, onEdit }: MealCardProps) {
  const { deleteMeal } = useNutritionStore()

  const handleDelete = async () => {
    if (confirm('Delete this meal?')) {
      await deleteMeal(meal.id)
    }
  }

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">{meal.name}</h3>
            {meal.time && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {meal.time}
              </div>
            )}
          </div>

          {/* Macro summary */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Protein</span>
              <div className="font-medium">{meal.totals.protein}g</div>
            </div>
            <div>
              <span className="text-gray-500">Carbs</span>
              <div className="font-medium">{meal.totals.carbs}g</div>
            </div>
            <div>
              <span className="text-gray-500">Fat</span>
              <div className="font-medium">{meal.totals.fat}g</div>
            </div>
            <div>
              <span className="text-gray-500">Calories</span>
              <div className="font-medium">{meal.totals.calories}</div>
            </div>
          </div>

          {/* Food list preview */}
          {meal.foods.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              <div className="flex flex-wrap gap-1">
                {meal.foods.slice(0, 3).map((food, index) => (
                  <span key={index} className="inline-block">
                    {food.name}
                    {index < Math.min(meal.foods.length, 3) - 1 && ', '}
                  </span>
                ))}
                {meal.foods.length > 3 && (
                  <span className="text-gray-400">
                    +{meal.foods.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes preview */}
          {meal.notes && (
            <div className="mt-2 text-sm text-gray-600 italic">
              "{meal.notes}"
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}