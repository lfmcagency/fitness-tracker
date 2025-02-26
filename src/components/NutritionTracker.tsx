'use client'

import React, { useState } from 'react';
import { Calendar, Plus, Search, Timer, Info, ChevronRight, ChevronDown, ArrowUp, BarChart2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { MacroGoals, Meal, Food } from '@/types';

const NutritionTracker: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [goals] = useState<MacroGoals>({
    protein: 140,
    carbs: 350,
    fat: 90,
    calories: 3000
  });

  const [meals, setMeals] = useState<Meal[]>([
    {
      id: 1,
      name: "Breakfast",
      time: "08:00",
      foods: [
        { name: "Oatmeal", amount: 100, protein: 13, carbs: 68, fat: 7, calories: 389 },
        { name: "Protein Shake", amount: 30, protein: 24, carbs: 3, fat: 2, calories: 120 }
      ]
    },
    {
      id: 2,
      name: "Lunch",
      time: "13:00",
      foods: [
        { name: "Chicken Breast", amount: 200, protein: 62, carbs: 0, fat: 7, calories: 330 }
      ]
    }
  ]);

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

  // Sample food database with types
  const foodDatabase: Food[] = [
    { name: "Chicken Breast", amount: 100, protein: 31, carbs: 0, fat: 3.6, calories: 165 },
    { name: "Oatmeal", amount: 100, protein: 13, carbs: 68, fat: 7, calories: 389 },
    { name: "Protein Shake", amount: 30, protein: 24, carbs: 3, fat: 2, calories: 120 }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header with Date Selection */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Nutrition Tracker</h1>
          <div className="flex items-center space-x-2 text-gray-600 cursor-pointer">
            <Calendar className="h-4 w-4" />
            <span>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        <button className="text-blue-600 hover:text-blue-700 font-medium">
          Weekly View
        </button>
      </div>

      {/* Macro Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Protein', value: totals.protein, goal: goals.protein, color: 'bg-pink-500', icon: 'P' },
          { label: 'Carbs', value: totals.carbs, goal: goals.carbs, color: 'bg-blue-500', icon: 'C' },
          { label: 'Fat', value: totals.fat, goal: goals.fat, color: 'bg-green-500', icon: 'F' },
          { label: 'Calories', value: totals.calories, goal: goals.calories, color: 'bg-orange-500', icon: 'kCal' }
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

      {/* Quick Add Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search foods..."
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSearch(true)}
          />
        </div>
        
        {/* Frequent Foods */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {["Protein Shake", "Chicken Breast", "Rice", "Eggs", "Oatmeal"].map((food, index) => (
              <button
                key={index}
                className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {food}
              </button>
            ))}
          </div>
        </div>
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
                <button className="text-blue-600 hover:text-blue-700">
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
      <button className="w-full p-4 bg-white rounded-lg border border-gray-200 text-blue-600 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
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
    </div>
  );
};

export default NutritionTracker;

