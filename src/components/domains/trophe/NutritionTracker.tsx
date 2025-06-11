// src/components/domains/trophe/NutritionTracker.tsx
'use client'

import { useEffect } from 'react'
import { useNutritionStore } from '@/store/nutrition'
import { DateSelector } from '@/components/domains/ethos/DateSelector'
import { TimeBlockContainer } from '@/components/shared/TimeBlockContainer'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { StatCard } from '@/components/shared/StatCard'
import { Card } from '@/components/ui/card'
import { MealTimeBlock } from './MealTimeBlock'

export function NutritionTracker() {
  const {
    selectedDate,
    setSelectedDate,
    meals,
    isLoading,
    error,
    macroGoals,
    fetchMealsForDate,
    fetchFoods,
    getDailyTotals,
    getGoalProgress,
    getMealsForTimeBlock
  } = useNutritionStore()

  // Fetch data when component mounts
  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchMealsForDate(selectedDate),
        fetchFoods() // This was missing
      ])
    }
    
    initData()
  }, [fetchMealsForDate, fetchFoods, selectedDate])

  // Handle date change
  const handleDateChange = (dateString: string) => {
  setSelectedDate(dateString)
}

  // Calculate current totals and progress
  const dailyTotals = getDailyTotals()
  const goalProgress = getGoalProgress()

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6 text-center">
          <p className="text-red-500 mb-2">Error loading nutrition data</p>
          <p className="text-sm text-gray-600">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <DateSelector
  selectedDate={selectedDate}
  onDateChange={handleDateChange}
/>
      </div>

      {/* Daily macro progress overview */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Daily Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Protein"
            value={dailyTotals.protein}
            unit="g"
            previousValue={macroGoals.protein}
            changeFormat="none"
          />
          <StatCard
            title="Carbs"
            value={dailyTotals.carbs}
            unit="g"
            previousValue={macroGoals.carbs}
            changeFormat="none"
          />
          <StatCard
            title="Fat"
            value={dailyTotals.fat}
            unit="g"
            previousValue={macroGoals.fat}
            changeFormat="none"
          />
          <StatCard
            title="Calories"
            value={dailyTotals.calories}
            unit="kcal"
            previousValue={macroGoals.calories}
            changeFormat="none"
          />
        </div>

        {/* Progress bars for goals */}
        <div className="space-y-3">
          <ProgressBar
            value={goalProgress.protein}
            label={`Protein: ${dailyTotals.protein}g / ${macroGoals.protein}g`}
            variant={goalProgress.protein >= 100 ? 'success' : 'default'}
            showPercentage={true}
          />
          <ProgressBar
            value={goalProgress.carbs}
            label={`Carbs: ${dailyTotals.carbs}g / ${macroGoals.carbs}g`}
            variant={goalProgress.carbs >= 100 ? 'success' : 'default'}
            showPercentage={true}
          />
          <ProgressBar
            value={goalProgress.fat}
            label={`Fat: ${dailyTotals.fat}g / ${macroGoals.fat}g`}
            variant={goalProgress.fat >= 100 ? 'success' : 'default'}
            showPercentage={true}
          />
          <ProgressBar
            value={goalProgress.calories}
            label={`Calories: ${dailyTotals.calories} / ${macroGoals.calories}`}
            variant={goalProgress.calories >= 100 ? 'success' : 'default'}
            showPercentage={true}
          />
        </div>
      </Card>

      {/* Meal time blocks */}
      <div className="space-y-8">
        <MealTimeBlock
          timeBlock="morning"
          title="Morning"
          timeRange="6:00 - 11:59"
          meals={getMealsForTimeBlock('morning')}
          selectedDate={selectedDate}
          isLoading={isLoading}
        />

        <MealTimeBlock
          timeBlock="afternoon"
          title="Afternoon"
          timeRange="12:00 - 17:59"
          meals={getMealsForTimeBlock('afternoon')}
          selectedDate={selectedDate}
          isLoading={isLoading}
        />

        <MealTimeBlock
          timeBlock="evening"
          title="Evening"
          timeRange="18:00 - 23:59"
          meals={getMealsForTimeBlock('evening')}
          selectedDate={selectedDate}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}