// src/app/admin/database/page.tsx
"use client"

import AppLayout from '@/components/layout/AppLayout'
import { UserManagement } from '@/components/domains/admin/UserManagement'
import { ExerciseImport } from '@/components/domains/admin/ExerciseImport'
import { FoodImport } from '@/components/domains/admin/FoodImport'
import { Card } from '@/components/ui/card'

export default function AdminPage() {
  return (
    <AppLayout title="Admin Dashboard" requireAuth={true}>
      <div className="space-y-8">
        {/* User Management */}
        <UserManagement />
        
        {/* Import Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <ExerciseImport />
          <FoodImport />
        </div>
      </div>
    </AppLayout>
  )
}