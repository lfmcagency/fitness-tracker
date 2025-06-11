// src/components/domains/trophe/MealEditor.tsx
'use client'

import { useState } from 'react'
import { Save, X, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNutritionStore } from '@/store/nutrition'
import { MealData, MealFoodData } from '@/types/api/mealResponses'
import { FoodSearchModal } from './FoodSearchModal'

interface MealEditorProps {
  meal: MealData
  onSave: () => void
  onCancel: () => void
}

export function MealEditor({ meal, onSave, onCancel }: MealEditorProps) {
  const { updateMeal, addFoodToMeal, removeFoodFromMeal } = useNutritionStore()
  
  const [name, setName] = useState(meal.name)
  const [time, setTime] = useState(meal.time)
  const [notes, setNotes] = useState(meal.notes || '')
  const [foods, setFoods] = useState<MealFoodData[]>(meal.foods)
  const [showFoodSearch, setShowFoodSearch] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddFood = async (food: MealFoodData) => {
    // Add food to meal via API
    await addFoodToMeal(meal.id, {
      foodId: food.foodId,
      name: food.name,
      amount: food.amount,
      unit: food.unit,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      calories: food.calories
    })
    
    // Update local state
    setFoods(prev => [...prev, { ...food, index: prev.length }])
    setShowFoodSearch(false)
  }

  const handleRemoveFood = async (index: number) => {
    // Update local state immediately for responsiveness
    setFoods(prev => prev.filter((_, i) => i !== index))
    
    // Make API call to remove from database
    await removeFoodFromMeal(meal.id, index)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    
    setIsSubmitting(true)
    try {
      const updates = {
        name: name.trim(),
        time,
        notes: notes.trim()
      }

      const result = await updateMeal(meal.id, updates)
      if (result) {
        onSave()
      }
    } catch (error) {
      console.error('Error updating meal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate totals from current foods
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
      <Card className="p-4 border-2 border-orange-200 bg-orange-50/50">
        <div className="space-y-4">
          {/* Meal name and time */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Meal name"
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
                No foods in this meal
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
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Meal
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