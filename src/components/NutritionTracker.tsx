'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Timer, Info, ChevronRight, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNutritionStore } from '@/store/nutrition';
import MealModal from './MealModal';

const NutritionTracker: React.FC = () => {
  const { meals, goals, isLoading, error, fetchMeals, addFoodToMeal, addMeal } = useNutritionStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeMealId, setActiveMealId] = useState<number | null>(null);
  const [showFoodModal, setShowFoodModal] = useState<boolean>(false);
  const [showMealModal, setShowMealModal] = useState<boolean>(false);

  useEffect(() => {
    fetchMeals(selectedDate.toISOString().split('T')[0]);
  }, [fetchMeals, selectedDate]);

  // Calculate totals
  const totals = meals.reduce((acc, meal) => {
    const mealTotals = meal.foods.reduce((mealAcc, food) => ({
      protein: mealAcc.protein + food.protein,
      carbs: mealAcc.carbs + food.carbs,
      fat: mealAcc.fat + food.fat,
      calories: mealAcc.calories + food.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    
    return {
      protein: acc.protein + mealTotals.protein,
      carbs: acc.carbs + mealTotals.carbs,
      fat: acc.fat + mealTotals.fat,
      calories: acc.calories + mealTotals.calories
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

  // Sample food database
  const foodDatabase = [
    { name: "Chicken Breast", amount: 100, protein: 31, carbs: 0, fat: 3.6, calories: 165 },
    { name: "Oatmeal", amount: 100, protein: 13, carbs: 68, fat: 7, calories: 389 },
    { name: "Protein Shake", amount: 30, protein: 24, carbs: 3, fat: 2, calories: 120 },
    { name: "Rice", amount: 100, protein: 7, carbs: 80, fat: 0.6, calories: 365 },
    { name: "Eggs", amount: 50, protein: 6, carbs: 0.6, fat: 5, calories: 78 },
    { name: "Broccoli", amount: 100, protein: 2.8, carbs: 7, fat: 0.4, calories: 34 }
  ];

  const handleAddFood = (mealId: number) => {
    setActiveMealId(mealId);
    setShowFoodModal(true);
    setSearchTerm('');
  };

  const quickAddFood = (food: any) => {
    if (activeMealId) {
      addFoodToMeal(activeMealId, food);
      setShowFoodModal(false);
      setSearchTerm('');
    }
  };

  const handleAddMeal = (mealData: { name: string; time: string }) => {
    addMeal(mealData);
  };

  const filteredFoods = searchTerm 
    ? foodDatabase.filter(food => food.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const handleDateChange = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + increment);
    setSelectedDate(newDate);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg">
      {/* Header with Date Selection */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Nutrition Tracker</h1>
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <button onClick={() => handleDateChange(-1)} className="px-1">◀</button>
            <span>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <button onClick={() => handleDateChange(1)} className="px-1">▶</button>
          </div>
        </div>
        <button className="text-blue-600 hover:text-blue-700 font-medium">
          Weekly View
        </button>
      </div>

      {/* Loading state */}
      {isLoading && <div className="text-center py-4">Loading meals...</div>}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Macro Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Protein', value: totals.protein, goal: goals.protein, color: 'bg-pink-500', textColor: 'text-pink-500', icon: 'P' },
          { label: 'Carbs', value: totals.carbs, goal: goals.carbs, color: 'bg-blue-500', textColor: 'text-blue-500', icon: 'C' },
          { label: 'Fat', value: totals.fat, goal: goals.fat, color: 'bg-green-500', textColor: 'text-green-500', icon: 'F' },
          { label: 'Calories', value: totals.calories, goal: goals.calories, color: 'bg-orange-500', textColor: 'text-orange-500', icon: 'kCal' }
        ].map((macro) => (
          <div key={macro.label} className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{macro.label}</span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${macro.color} text-white`}>
                {macro.icon}
              </span>
            </div>
            <div className="text-2xl font-bold">{macro.value}</div>
            <div className="text-sm text-gray-600">of {macro.goal}</div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div 
                className={`h-full rounded-full ${macro.color}`}
                style={{ width: `${Math.min((macro.value / macro.goal) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Food Search & Quick Add */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search foods..."
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-gray-500">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Frequent Foods */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {["Protein Shake", "Chicken Breast", "Rice", "Eggs", "Oatmeal"].map((foodName, index) => {
              const food = foodDatabase.find(f => f.name === foodName);
              return (
                <button
                  key={index}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                  onClick={() => food && activeMealId && quickAddFood(food)}
                >
                  {foodName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Results */}
        {searchTerm && filteredFoods.length > 0 && (
          <div className="mt-2 border rounded-md divide-y">
            {filteredFoods.map((food, idx) => (
              <button
                key={idx}
                className="w-full p-2 text-left hover:bg-gray-50 flex justify-between items-center"
                onClick={() => activeMealId && quickAddFood(food)}
              >
                <span>{food.name}</span>
                <span className="text-sm text-gray-500">{food.amount}g</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meals List */}
      <div className="space-y-4">
        {meals.map((meal) => (
          <div key={meal.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{meal.name}</h3>
                  <span className="text-sm text-gray-500">
                    <Timer className="h-4 w-4 inline mr-1" />
                    {meal.time}
                  </span>
                </div>
                <button 
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => handleAddFood(meal.id)}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Foods in meal */}
            <div className="divide-y divide-gray-100">
              {meal.foods.map((food, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{food.name}</span>
                    <span className="text-gray-600">{food.amount}g</span>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-pink-500">P: {food.protein}</span>
                    <span className="text-blue-500">C: {food.carbs}</span>
                    <span className="text-green-500">F: {food.fat}</span>
                    <span className="text-orange-500">{food.calories} kCal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Meal Button */}
      <button 
        className="w-full p-4 bg-white rounded-lg border border-gray-200 text-blue-600 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        onClick={() => setShowMealModal(true)}
      >
        <Plus className="h-5 w-5" />
        <span>Add New Meal</span>
      </button>

      {/* Smart Nutrition Tip */}
      {totals.protein < goals.protein * 0.8 && (
        <Alert className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <Info className="h-4 w-4" />
          <AlertTitle>Protein Intake Alert</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center justify-between">
              <span>You're {goals.protein - totals.protein}g away from your protein goal.</span>
              <button className="text-blue-600 hover:text-blue-700">
                Suggest Foods
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Food Selection Modal */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium">Add Food</h3>
              <button onClick={() => setShowFoodModal(false)} className="text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border rounded-md p-2">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search foods..."
                  className="w-full outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              
              {searchTerm ? (
                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {filteredFoods.length > 0 ? (
                    filteredFoods.map((food, idx) => (
                      <button
                        key={idx}
                        className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                        onClick={() => quickAddFood(food)}
                      >
                        <div>
                          <div className="font-medium">{food.name}</div>
                          <div className="text-sm text-gray-500">
                            P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g | {food.calories} kCal
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{food.amount}g</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">No foods found</div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-medium">Quick Add</h4>
                  <div className="flex flex-wrap gap-2">
                    {foodDatabase.map((food, index) => (
                      <button
                        key={index}
                        className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                        onClick={() => quickAddFood(food)}
                      >
                        {food.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      <MealModal 
        isOpen={showMealModal}
        onClose={() => setShowMealModal(false)}
        onSave={handleAddMeal}
      />
    </div>
  );
};

export default NutritionTracker;