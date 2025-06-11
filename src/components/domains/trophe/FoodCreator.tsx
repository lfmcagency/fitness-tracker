// src/components/domains/trophe/FoodCreator.tsx
'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNutritionStore } from '@/store/nutrition'
import { CreateFoodRequest } from '@/types/api/foodRequests'

interface FoodCreatorProps {
  onSave: () => void
  onCancel: () => void
}

const foodCategories = [
  'Protein',
  'Dairy',
  'Grains',
  'Vegetables',
  'Fruits',
  'Nuts & Seeds',
  'Oils & Fats',
  'Beverages',
  'Snacks',
  'Prepared Foods',
  'Other'
]

const servingUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece']

export function FoodCreator({ onSave, onCancel }: FoodCreatorProps) {
  const { createFood } = useNutritionStore()
  
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [servingSize, setServingSize] = useState('100')
  const [servingUnit, setServingUnit] = useState('g')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [calories, setCalories] = useState('')
  const [barcode, setBarcode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculate calories if macros are provided
  const calculateCalories = () => {
    const p = parseFloat(protein) || 0
    const c = parseFloat(carbs) || 0
    const f = parseFloat(fat) || 0
    const calculatedCals = (p * 4) + (c * 4) + (f * 9)
    
    if (calculatedCals > 0 && !calories) {
      setCalories(Math.round(calculatedCals).toString())
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    
    setIsSubmitting(true)
    try {
      const foodData: CreateFoodRequest = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        category: category || 'Other',
        servingSize: parseFloat(servingSize) || 100,
        servingUnit: servingUnit,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        calories: parseFloat(calories) || 0,
        barcode: barcode.trim() || undefined
      }

      const result = await createFood(foodData)
      if (result) {
        onSave()
      }
    } catch (error) {
      console.error('Error creating food:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6 border-2 border-green-200 bg-green-50/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Add Custom Food</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Food Name *
            </label>
            <Input
              placeholder="e.g., Chicken Breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Brand (optional)
            </label>
            <Input
              placeholder="e.g., Tyson"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        {/* Category and serving */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {foodCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Serving Size *
            </label>
            <Input
              type="number"
              placeholder="100"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              className="bg-white"
              min="0.1"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Unit
            </label>
            <Select value={servingUnit} onValueChange={setServingUnit}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {servingUnits.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Macros */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Nutrition (per {servingSize || '100'}{servingUnit})
          </label>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Protein (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                onBlur={calculateCalories}
                className="bg-white"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Carbs (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                onBlur={calculateCalories}
                className="bg-white"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fat (g)</label>
              <Input
                type="number"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                onBlur={calculateCalories}
                className="bg-white"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Calories</label>
              <Input
                type="number"
                placeholder="Auto-calculated"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="bg-white"
                min="0"
              />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Calories will be auto-calculated from macros if left empty
          </div>
        </div>

        {/* Optional fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <Textarea
              placeholder="Additional notes about this food..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white min-h-[60px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Barcode (optional)
            </label>
            <Input
              placeholder="e.g., 123456789012"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Food
          </Button>
        </div>
      </div>
    </Card>
  )
}