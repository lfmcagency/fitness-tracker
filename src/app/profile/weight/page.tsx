// src/app/profile/weight/page.tsx
"use client"

import React from 'react'
import AppLayout from '@/components/layout/AppLayout'
import WeightEntryForm from '@/components/profile/WeightEntryForm'
import WeightHistoryDisplay from '@/components/profile/WeightHistoryDisplay'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function WeightPage() {
  const { user } = useAuth()
  const [refreshHistory, setRefreshHistory] = React.useState(0)
  
  // Handle successful weight entry to refresh history
  const handleWeightAdded = () => {
    setRefreshHistory(prev => prev + 1)
  }
  
  return (
    <AppLayout title="Weight Tracking" requireAuth={true}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Entry Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Log Weight</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightEntryForm 
                onSuccess={handleWeightAdded} 
                withCard={false}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Weight History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Weight History</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightHistoryDisplay 
                key={refreshHistory}
                showTrends={true} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}