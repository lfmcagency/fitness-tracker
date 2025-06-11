'use client'
import AppLayout from "@/components/layout/AppLayout"
import { NutritionTracker } from '@/components/domains/trophe/NutritionTracker'

export default function NutritionPage() {
  return (
    <AppLayout>
      <NutritionTracker />
    </AppLayout>
  )
}