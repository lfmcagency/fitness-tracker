// src/app/auth/signup/page.tsx
"use client"

import React from 'react'
import AuthLayout from '@/components/auth/AuthLayout'
import RegisterForm from '@/components/auth/Registerform'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])
  
  // If still checking auth status, show nothing to prevent flash
  if (isLoading) {
    return null
  }
  
  return (
    <AuthLayout 
      title="Create Your Account" 
      subtitle="Join Kalos to track your fitness journey"
    >
      <RegisterForm redirectPath="/dashboard" />
    </AuthLayout>
  )
}