
'use client'
import AppLayout from "@/components/layout/AppLayout"
import { DailyRoutineManager } from '@/components/domains/ethos/DailyRoutineManager'
export default function RoutinePage() {
  return (
    <AppLayout>
      <DailyRoutineManager />
    </AppLayout>
  )
}