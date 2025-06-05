'use client'

import { EnhancedTask } from '@/types'

interface ProgressIndicatorProps {
  tasks: EnhancedTask[]
}

export default function ProgressIndicator({ tasks }: ProgressIndicatorProps) {
  const completedCount = tasks.filter(task => task.completed).length
  const totalCount = tasks.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-kalos-border p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-kalos-muted">Daily Progress</span>
        <span className="text-sm font-medium">{completionPercentage}%</span>
      </div>
      
      <div className="h-2 bg-kalos-border rounded-full overflow-hidden">
        <div
          className="h-full bg-kalos-dark rounded-full transition-all duration-500 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-kalos-muted">
        <span>{completedCount} of {totalCount} completed</span>
        {completedCount === totalCount && totalCount > 0 && (
          <span className="text-green-600 font-medium">All done! 🎉</span>
        )}
      </div>
    </div>
  )
}