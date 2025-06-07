'use client'

import { TaskData } from '@/types'
import TaskItem from './TaskItem'

interface TaskListProps {
  tasks: TaskData[]
  isLoading: boolean
  onTaskComplete: (taskId: string, completed: boolean, date?: string) => void
  onTaskUpdate: (taskId: string, updates: any) => void
  onTaskDelete: (taskId: string) => void
  selectedDate?: Date
}

export default function TaskList({ 
  tasks, 
  isLoading, 
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  selectedDate = new Date() // Default to today if not provided
}: TaskListProps) {
  // Debug logs
  console.log('TaskList - Tasks received:', tasks.length);
  console.log('TaskList - Task IDs:', tasks.map(t => ({ id: t.id, name: t.name })));
  // Group tasks by time block
  const getTimeBlock = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    return 'Evening'
  }

  const tasksByTimeBlock = tasks.reduce((acc, task) => {
  const block = getTimeBlock(task.scheduledTime)
  if (!acc[block]) acc[block] = []
  acc[block].push(task)
  return acc
}, {} as Record<string, TaskData[]>)

  // Sort tasks within each time block by scheduled time
  Object.keys(tasksByTimeBlock).forEach(block => {
    tasksByTimeBlock[block].sort((a, b) => 
      a.scheduledTime.localeCompare(b.scheduledTime)
    )
  })

  const timeBlocks = ['Morning', 'Afternoon', 'Evening'] as const

  if (isLoading) {
    return (
      <div className="space-y-6">
        {timeBlocks.map(block => (
          <div key={block}>
            <h3 className="text-sm font-medium text-kalos-muted mb-4">{block}</h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-kalos-border animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-kalos-muted">No tasks scheduled for this day</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {timeBlocks.map(block => {
        const blockTasks = tasksByTimeBlock[block] || []
        
        if (blockTasks.length === 0) return null
        
        return (
          <div key={block}>
            <h3 className="text-sm font-medium text-kalos-muted mb-4">{block}</h3>
            <div className="space-y-3">
              {blockTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={(completed, date) => onTaskComplete(String(task.id), completed, date)}
                  onUpdate={(updates) => onTaskUpdate(String(task.id), updates)}
                  onDelete={() => onTaskDelete(String(task.id))}
                  selectedDate={selectedDate} // Pass selectedDate to TaskItem
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}