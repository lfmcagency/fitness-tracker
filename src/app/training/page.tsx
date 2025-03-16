// src/app/training/page.tsx
"use client"

import AppLayout from "@/components/layout/AppLayout"
import Link from "next/link"

export default function TrainingPage() {
  return (
    <AppLayout title="Training">
      <div className="px-6">
        <h2 className="text-xl font-medium mb-6">Your Training</h2>
        
        <div className="space-y-6">
          {/* Training overview components */}
          <Link href="/training/workout" className="block">
            <div className="p-4 bg-white rounded-lg border border-[#E5E0DC] flex items-center">
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
                {/* Icon */}
              </div>
              <div>
                <h3 className="font-medium">Start Workout</h3>
                <p className="text-sm text-[#6B6B6B]">Create and track your training session</p>
              </div>
            </div>
          </Link>
          
          <Link href="/skill-tree" className="block">
            <div className="p-4 bg-white rounded-lg border border-[#E5E0DC] flex items-center">
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
                {/* Icon */}
              </div>
              <div>
                <h3 className="font-medium">Skill Tree</h3>
                <p className="text-sm text-[#6B6B6B]">Explore exercise progressions</p>
              </div>
            </div>
          </Link>
          
          <Link href="/training/history" className="block">
            <div className="p-4 bg-white rounded-lg border border-[#E5E0DC] flex items-center">
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
                {/* Icon */}
              </div>
              <div>
                <h3 className="font-medium">Workout History</h3>
                <p className="text-sm text-[#6B6B6B]">View past workouts and progress</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}