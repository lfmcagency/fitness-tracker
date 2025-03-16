// src/app/nutrition/page.tsx
"use client"

import AppLayout from "@/components/layout/AppLayout"

export default function NutritionPage() {
  return (
    <AppLayout title="Nutrition">
      <div className="px-6">
        <h2 className="text-xl font-medium mb-6">Your Nutrition</h2>
        
        {/* Add nutrition components here */}
        {/* Example: <MacroTracker /> */}
        
        <div className="h-32 bg-white rounded-lg border border-[#E5E0DC] flex items-center justify-center mb-6">
          <p className="text-[#6B6B6B]">Today's Nutrition Component</p>
        </div>
        
        {/* Example: <MealList /> */}
        <div className="h-32 bg-white rounded-lg border border-[#E5E0DC] flex items-center justify-center">
          <p className="text-[#6B6B6B]">Meal List Component</p>
        </div>
      </div>
    </AppLayout>
  )
}