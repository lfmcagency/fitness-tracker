// src/app/auth/signin/page.tsx
"use client"

import React from 'react'
import AuthLayout from '@/components/auth/AuthLayout'
import LoginForm from '@/components/auth/LoginForm'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignInPage() {
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
      title="Sign In to Kalos" 
      subtitle="Enter your credentials to access your account"
    >
      <LoginForm redirectPath="/dashboard" />
    </AuthLayout>
  )
}