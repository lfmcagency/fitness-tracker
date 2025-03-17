// src/app/profile/page.tsx
"use client"

import AppLayout from "@/components/layout/AppLayout"
import { useSession } from "next-auth/react"

export default function ProfilePage() {
  const { data: session } = useSession()
  
  return (
    <AppLayout title="Profile">
      <div className="px-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
            {/* User avatar or initials */}
          </div>
          <div>
            <h2 className="text-xl font-medium">{session?.user?.name || 'User'}</h2>
            <p className="text-[#6B6B6B]">{session?.user?.email}</p>
          </div>
        </div>
        
        {/* Profile sections */}
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-lg border border-[#E5E0DC]">
            <h3 className="font-medium mb-3">Body Metrics</h3>
            {/* Body metrics component */}
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-[#E5E0DC]">
            <h3 className="font-medium mb-3">Settings</h3>
            {/* Settings component */}
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-[#E5E0DC]">
            <h3 className="font-medium mb-3">Account</h3>
            {/* Account management component */}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}