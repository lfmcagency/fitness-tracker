// src/components/domains/trophe/FoodSearchModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useNutritionStore } from '@/store/nutrition'
import { FoodData } from '@/types/api/foodResponses'
import { MealFoodData } from '@/types/api/mealResponses'
import { FoodCreator } from './FoodCreator'
import { Plus, Search } from 'lucide-react'

interface FoodSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectFood: (food: MealFoodData) => void
}

export function FoodSearchModal({ isOpen, onClose, onSelectFood }: FoodSearchModalProps) {
  const { foods, fetchFoods, createFood } = useNutritionStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null)
  const [amount, setAmount] = useState('100')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Fetch foods on open
  useEffect(() => {
    if (isOpen) {
      fetchFoods()
    }
  }, [isOpen, fetchFoods])

  // Search foods when query changes
  useEffect(() => {
    if (searchQuery) {
      fetchFoods(searchQuery)
    } else {
      fetchFoods()
    }
  }, [searchQuery, fetchFoods])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleCreateFood = () => {
    setShowCreateForm(false)
    // Refresh foods list
    fetchFoods(searchQuery)
  }

  const handleSelectFood = (food: FoodData) => {
    setSelectedFood(food)
    setShowCreateForm(false)
  }

  const handleAddFood = () => {
    if (!selectedFood) return

    const amountNum = parseFloat(amount) || 100
    const ratio = amountNum / selectedFood.servingSize
    
    const mealFood: MealFoodData = {
      foodId: selectedFood.id,
      name: selectedFood.name,
      amount: amountNum,
      unit: selectedFood.servingUnit,
      protein: Math.round((selectedFood.protein * ratio) * 10) / 10,
      carbs: Math.round((selectedFood.carbs * ratio) * 10) / 10,
      fat: Math.round((selectedFood.fat * ratio) * 10) / 10,
      calories: Math.round(selectedFood.calories * ratio)
    }

    onSelectFood(mealFood)
    handleClose()
  }

  const handleClose = () => {
    setSelectedFood(null)
    setAmount('100')
    setSearchQuery('')
    setShowCreateForm(false)
    onClose()
  }

  const columns = [
    {
      key: 'name' as keyof FoodData,
      label: 'Food',
      render: (value: any, food: FoodData) => (
        <div>
          <div className="font-medium">{food.name}</div>
          {food.brand && (
            <div className="text-xs text-gray-500">{food.brand}</div>
          )}
        </div>
      )
    },
    {
      key: 'servingSize' as keyof FoodData,
      label: 'Serving',
      render: (value: any, food: FoodData) => 
        `${food.servingSize}${food.servingUnit}`
    },
    {
      key: 'protein' as keyof FoodData,
      label: 'Protein',
      render: (value: number) => `${value}g`
    },
    {
      key: 'carbs' as keyof FoodData,
      label: 'Carbs', 
      render: (value: number) => `${value}g`
    },
    {
      key: 'calories' as keyof FoodData,
      label: 'Calories'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Food to Meal</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Search */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search foods..."
            showClear={true}
          />

          {/* Main content */}
          {selectedFood ? (
            /* Food details and amount selection */
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-lg">{selectedFood.name}</h3>
                    {selectedFood.brand && (
                      <p className="text-gray-600">{selectedFood.brand}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Per {selectedFood.servingSize}{selectedFood.servingUnit}: 
                      {selectedFood.protein}g protein, {selectedFood.carbs}g carbs, 
                      {selectedFood.fat}g fat, {selectedFood.calories} calories
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedFood(null)}
                  >
                    Change Food
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">How much?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount ({selectedFood.servingUnit})
                    </label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nutritional Info
                    </label>
                    {(() => {
                      const amountNum = parseFloat(amount) || 100
                      const ratio = amountNum / selectedFood.servingSize
                      return (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Protein: {Math.round((selectedFood.protein * ratio) * 10) / 10}g</div>
                          <div>Carbs: {Math.round((selectedFood.carbs * ratio) * 10) / 10}g</div>
                          <div>Fat: {Math.round((selectedFood.fat * ratio) * 10) / 10}g</div>
                          <div>Calories: {Math.round(selectedFood.calories * ratio)}</div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* Food list */
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">
                  {foods.length} foods found
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Custom Food
                </Button>
              </div>

              <div className="h-[400px] overflow-auto">
                <DataTable
                  data={foods}
                  columns={columns}
                  searchPlaceholder="Search foods..."
                  emptyMessage="No foods found. Try a different search or add a custom food."
                  actions={(food) => (
                    <Button
                      size="sm"
                      onClick={() => handleSelectFood(food)}
                    >
                      Select
                    </Button>
                  )}
                />
              </div>
            </div>
          )}

          {/* Create custom food form */}
          {showCreateForm && (
            <Card className="p-4 border-2 border-green-200 bg-green-50/50">
              <h4 className="font-medium mb-3">Add Custom Food</h4>
              <div className="text-sm text-gray-600 mb-2">
                This is a simplified form. For now, you can close this and search for existing foods.
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </Card>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {selectedFood && (
            <Button onClick={handleAddFood}>
              Add to Meal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}