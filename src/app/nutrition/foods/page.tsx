'use client'
import AppLayout from "@/components/layout/AppLayout"
import { FoodDatabase } from '@/components/domains/trophe/FoodDatabase'

export default function FoodDatabasePage() {
  return (
    <AppLayout>
      <FoodDatabase />
    </AppLayout>
  )
}