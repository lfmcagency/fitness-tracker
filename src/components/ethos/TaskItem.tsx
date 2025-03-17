// src/components/routine/TaskItem.tsx
import { Flame } from 'lucide-react'
import { EnhancedTask } from '@/types'
import { useTaskStore } from '@/store/tasks'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: EnhancedTask
}

export default function TaskItem({ task }: TaskItemProps) {
  const { completeTask, updateTask } = useTaskStore()
  
  const handleToggleCompletion = () => {
    if (task.completed) {
      // Uncomplete the task
      updateTask(task.id!, { completed: false });
    } else {
      // Complete the task
      completeTask(task.id!);
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-kalos-high'
      case 'medium':
        return 'text-kalos-medium'
      case 'low':
        return 'text-kalos-low'
      default:
        return 'text-kalos-medium'
    }
  }
  
  return (
    <div className="flex items-start">
      <button
        onClick={handleToggleCompletion}
        className={cn(
          "w-6 h-6 rounded-full border flex-shrink-0 mr-4 mt-1",
          "flex items-center justify-center transition-all duration-200",
          task.completed ? "bg-kalos-text border-kalos-text" : "border-kalos-secondary bg-transparent"
        )}
      >
        {task.completed && <div className="w-2 h-2 bg-white rounded-full" />}
      </button>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className={cn("text-base font-normal", task.completed && "line-through text-kalos-secondary")}>
            {task.name}
          </h4>
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              <Flame className="w-3.5 h-3.5 text-kalos-high mr-1" />
              <span className="text-xs">{task.currentStreak}</span>
            </div>
            <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
              {task.priority}
            </span>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-kalos-secondary mb-1">{task.description}</p>
        )}

        <div className="flex items-center text-xs text-kalos-secondary">
          <span className="mr-2">{task.scheduledTime}</span>
          <span className="mr-2">•</span>
          <span className="mr-2">{task.category}</span>
          <span className="mr-2">•</span>
          <span>{task.recurrencePattern}</span>
        </div>
      </div>
    </div>
  )
}