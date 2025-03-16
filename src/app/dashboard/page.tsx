// src/app/dashboard/page.tsx
"use client"

import AppLayout from "@/components/layout/AppLayout"

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard">
      <div className="px-6">
        <h2 className="text-xl font-medium mb-6">Your Progress</h2>
        
        {/* Add progress components here */}
        {/* Example: <ProgressDashboard /> */}
        
        <div className="h-32 bg-white rounded-lg border border-[#E5E0DC] flex items-center justify-center mb-6">
          <p className="text-[#6B6B6B]">Progress Dashboard Component</p>
        </div>
        
        {/* Example: <AchievementsList /> */}
        <div className="h-32 bg-white rounded-lg border border-[#E5E0DC] flex items-center justify-center">
          <p className="text-[#6B6B6B]">Recent Achievements Component</p>
        </div>
      </div>
    </AppLayout>
  )
}