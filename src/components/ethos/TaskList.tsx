// src/components/routine/TaskList.tsx
import { useMemo } from 'react'
import { EnhancedTask } from '@/types'
import TaskItem from './TaskItem'

interface TaskListProps {
  tasks: EnhancedTask[];
  activeFilters: string[];
  date: Date;
}

// Define time blocks
type TimeBlock = 'Morning' | 'Afternoon' | 'Evening';
const timeBlocks: TimeBlock[] = ['Morning', 'Afternoon', 'Evening'];

export default function TaskList({ tasks, activeFilters, date }: TaskListProps) {
  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    if (activeFilters.length === 0) return tasks;
    
    return tasks.filter(task => {
      return activeFilters.some(filter => {
        switch (filter) {
          case 'completed':
            return task.completed;
          case 'incomplete':
            return !task.completed;
          case 'high':
            return task.priority === 'high';
          case 'medium':
            return task.priority === 'medium';
          case 'low':
            return task.priority === 'low';
          case 'nous':
            return task.category === 'Nous';
          case 'soma':
            return task.category === 'Soma';
          case 'trophe':
            return task.category === 'Trophe';
          default:
            return true;
        }
      });
    });
  }, [tasks, activeFilters]);
  
  // Group tasks by time block
  const tasksByTimeBlock = useMemo(() => {
    const grouped: Record<TimeBlock, EnhancedTask[]> = {
      'Morning': [],
      'Afternoon': [],
      'Evening': []
    };
    
    filteredTasks.forEach(task => {
      const time = task.scheduledTime;
      const hour = parseInt(time.split(':')[0]);
      
      let timeBlock: TimeBlock;
      if (hour < 12) {
        timeBlock = 'Morning';
      } else if (hour < 18) {
        timeBlock = 'Afternoon';
      } else {
        timeBlock = 'Evening';
      }
      
      grouped[timeBlock].push(task);
    });
    
    return grouped;
  }, [filteredTasks]);
  
  return (
    <div className="space-y-8">
      {timeBlocks.map(timeBlock => {
        const blockTasks = tasksByTimeBlock[timeBlock];
        
        if (blockTasks.length === 0) return null;
        
        return (
          <div key={timeBlock}>
            <h3 className="text-kalos-secondary text-sm font-medium mb-4">{timeBlock}</h3>
            <div className="space-y-6">
              {blockTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
      
      {filteredTasks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-kalos-secondary">No tasks found for this day</p>
        </div>
      )}
    </div>
  );
}