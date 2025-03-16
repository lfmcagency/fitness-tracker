'use client'
import AppLayout from "@/components/layout/AppLayout"

import DailyRoutineManager from '@/components/DailyRoutineManager'

export default function RoutinePage() {
  return (
    <AppLayout title="Daily Routine">
      <div className="px-6">
      <DailyRoutineManager />
        <div className="h-32 bg-white rounded-lg border border-[#E5E0DC] flex items-center justify-center">
          <p className="text-[#6B6B6B]">Daily Routine Component</p>
        </div>
      </div>
    </AppLayout>
  )
}