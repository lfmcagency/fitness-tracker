// src/app/profile/page.tsx
"use client"

import React from 'react'
import AppLayout from '@/components/layout/AppLayout'
import ProfileOverview from '@/components/profile/ProfileOverview'
import { useAuth } from '@/components/auth/AuthProvider'

export default function ProfilePage() {
  const { user } = useAuth()
  
  return (
    <AppLayout title="Profile" requireAuth={true}>
      <ProfileOverview userId={user?.id} />
    </AppLayout>
  )
}