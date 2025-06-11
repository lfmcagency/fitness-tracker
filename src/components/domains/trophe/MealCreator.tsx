// src/components/domains/trophe/MealCreator.tsx
'use client'

import { useState } from 'react'
import { Save, X, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNutritionStore } from '@/store/nutrition'
import { CreateMealRequest } from '@/types/api/mealRequests'
import { FoodSearchModal } from './FoodSearchModal'
import { MealFoodData } from '@/types/api/mealResponses'

type TimeBlockType = 'morning' | 'afternoon' | 'evening'

interface MealCreatorProps {
  timeBlock: TimeBlockType
  selectedDate: string
  onSave: () => void
  onCancel: () => void
}

export function MealCreator({ timeBlock, selectedDate, onSave, onCancel }: MealCreatorProps) {
  const { createMeal } = useNutritionStore()
  
  const [name, setName] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [foods, setFoods] = useState<MealFoodData[]>([])
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get default time based on time block
  const getDefaultTime = () => {
    switch (timeBlock) {
      case 'morning': return '08:00'
      case 'afternoon': return '13:00'
      case 'evening': return '19:00'
      default: return '12:00'
    }
  }

  // Initialize time if empty
  if (!time) {
    setTime(getDefaultTime())
  }

  const handleAddFood = (food: MealFoodData) => {
    setFoods(prev => [...prev, { ...food, index: prev.length }])
    setShowFoodSearch(false)
  }

  const handleRemoveFood = (index: number) => {
    setFoods(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) return
    
    setIsSubmitting(true)
    try {
      const mealData: CreateMealRequest = {
        name: name.trim(),
        time,
        date: selectedDate,
        foods: foods.map(food => ({
          foodId: food.foodId,
          name: food.name,
          amount: food.amount,
          unit: food.unit,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          calories: food.calories
        })),
        notes: notes.trim()
      }

      const result = await createMeal(mealData)
      if (result) {
        onSave()
      }
    } catch (error) {
      console.error('Error creating meal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate totals
  const totals = foods.reduce(
    (acc, food) => ({
      protein: acc.protein + (food.protein || 0),
      carbs: acc.carbs + (food.carbs || 0),
      fat: acc.fat + (food.fat || 0),
      calories: acc.calories + (food.calories || 0)
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  )

  return (
    <>
      <Card className="p-4 border-2 border-dashed border-blue-200 bg-blue-50/50">
        <div className="space-y-4">
          {/* Meal name and time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Meal name (e.g., Breakfast)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Foods section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Foods</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFoodSearch(true)}
                className="h-7"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Food
              </Button>
            </div>

            {foods.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-md bg-white">
                No foods added yet
              </div>
            ) : (
              <div className="space-y-2">
                {foods.map((food, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{food.name}</div>
                      <div className="text-xs text-gray-500">
                        {food.amount}{food.unit} • P: {food.protein}g C: {food.carbs}g F: {food.fat}g • {food.calories} cal
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFood(index)}
                      className="h-6 w-6 p-0 text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {foods.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="font-medium">{totals.protein.toFixed(1)}g</div>
                    <div className="text-gray-500">Protein</div>
                  </div>
                  <div>
                    <div className="font-medium">{totals.carbs.toFixed(1)}g</div>
                    <div className="text-gray-500">Carbs</div>
                  </div>
                  <div>
                    <div className="font-medium">{totals.fat.toFixed(1)}g</div>
                    <div className="text-gray-500">Fat</div>
                  </div>
                  <div>
                    <div className="font-medium">{Math.round(totals.calories)}</div>
                    <div className="text-gray-500">Calories</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white min-h-[60px]"
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!name.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Meal
            </Button>
          </div>
        </div>
      </Card>

      {/* Food search modal */}
      <FoodSearchModal
        isOpen={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onSelectFood={handleAddFood}
      />
    </>
  )
}