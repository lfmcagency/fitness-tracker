// src/components/domains/trophe/FoodDatabase.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNutritionStore } from '@/store/nutrition'
import { FoodData } from '@/types/api/foodResponses'
import { FoodCreator } from './FoodCreator'
import { FoodEditor } from './FoodEditor'

export function FoodDatabase() {
  const { foods, fetchFoods, isLoading } = useNutritionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodData | null>(null)

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    fetchFoods(query)
  }

  const handleCreateFood = () => {
    setIsCreating(true)
    setEditingFood(null)
  }

  const handleEditFood = (food: FoodData) => {
    setEditingFood(food)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingFood(null)
  }

  const handleSaved = () => {
    setIsCreating(false)
    setEditingFood(null)
    // Refresh food list
    fetchFoods(searchQuery)
  }

  const columns = [
    {
      key: 'name' as keyof FoodData,
      label: 'Food Name',
      render: (value: any, food: FoodData) => (
        <div>
          <div className="font-medium">{food.name}</div>
          {food.brand && (
            <div className="text-xs text-gray-500">{food.brand}</div>
          )}
          {food.description && (
            <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
              {food.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category' as keyof FoodData,
      label: 'Category',
      render: (value: string) => value || 'Other'
    },
    {
      key: 'servingSize' as keyof FoodData,
      label: 'Serving Size',
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
      key: 'fat' as keyof FoodData,
      label: 'Fat',
      render: (value: number) => `${value}g`
    },
    {
      key: 'calories' as keyof FoodData,
      label: 'Calories'
    },
    {
      key: 'isSystemFood' as keyof FoodData,
      label: 'Type',
      render: (value: boolean) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          value 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {value ? 'System' : 'Custom'}
        </span>
      )
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Food Database</h1>
        <Button onClick={handleCreateFood} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Food
        </Button>
      </div>

      {/* Create/Edit Forms */}
      {isCreating && (
        <FoodCreator
          onSave={handleSaved}
          onCancel={handleCancel}
        />
      )}

      {editingFood && (
        <FoodEditor
          food={editingFood}
          onSave={handleSaved}
          onCancel={handleCancel}
        />
      )}

      {/* Search and Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search foods by name, brand, or category..."
            showClear={true}
          />

          <DataTable
            data={foods}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Search foods..."
            emptyMessage="No foods found. Try a different search or add some custom foods."
            actions={(food) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditFood(food)}
                  className="h-8 w-8 p-0"
                  disabled={food.isSystemFood} // Can't edit system foods
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {!food.isSystemFood && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm(`Delete "${food.name}"?`)) {
                        // TODO: Add delete functionality to store
                        console.log('Delete food:', food.id)
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          />

          <div className="text-sm text-gray-500 text-center">
            Showing {foods.length} foods • System foods can be viewed but not edited
          </div>
        </div>
      </Card>
    </div>
  )
}