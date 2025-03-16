// src/components/routine/CreateTaskModal.tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTaskStore, CreateTaskParams } from '@/store/tasks'
import { RecurrencePattern, TaskPriority } from '@/types'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
}

export default function CreateTaskModal({ open, onOpenChange, date }: CreateTaskModalProps) {
  const { addTask } = useTaskStore()
  
  const [newTask, setNewTask] = useState<CreateTaskParams>({
    name: '',
    scheduledTime: '',
    recurrencePattern: 'daily',
    category: 'Nous',
    priority: 'medium',
    date: format(date, 'yyyy-MM-dd')
  })
  
  const timeBlocks = ["Morning", "Afternoon", "Evening"]
  const categories = ["Nous", "Soma", "Trophe"]
  const priorities: TaskPriority[] = ["high", "medium", "low"]
  const recurrences: RecurrencePattern[] = ["daily", "weekdays", "weekends", "weekly", "custom"]
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewTask({ ...newTask, [name]: value })
  }
  
  const handleSelectChange = (name: string, value: string) => {
    setNewTask({ ...newTask, [name]: value })
  }
  
  const handleCreateTask = async () => {
    if (!newTask.name) return
    
    // Update date based on the current selected date
    const taskWithDate = {
      ...newTask,
      date: format(date, 'yyyy-MM-dd')
    }
    
    // Add task using store method
    const result = await addTask(taskWithDate)
    
    if (result) {
      // Reset form
      setNewTask({
        name: '',
        scheduledTime: '',
        recurrencePattern: 'daily',
        category: 'Nous',
        priority: 'medium',
        date: format(date, 'yyyy-MM-dd')
      })
      
      // Close modal
      onOpenChange(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-kalos-background border-[#E5E0DC] p-6 max-w-[350px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Task Name
            </label>
            <Input
              id="name"
              name="name"
              value={newTask.name}
              onChange={handleInputChange}
              className="bg-transparent border-[#E5E0DC] focus-visible:ring-kalos-text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="description">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={newTask.description || ''}
              onChange={handleInputChange}
              className="bg-transparent border-[#E5E0DC] focus-visible:ring-kalos-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="scheduledTime">
                Time
              </label>
              <Input
                id="scheduledTime"
                name="scheduledTime"
                type="time"
                value={newTask.scheduledTime}
                onChange={handleInputChange}
                className="bg-transparent border-[#E5E0DC] focus-visible:ring-kalos-text"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time Block</label>
              <Select 
                value={newTask.timeBlock || 'Morning'} 
                onValueChange={(value: string) => handleSelectChange("timeBlock", value)}
              >
                <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-kalos-text">
                  <SelectValue placeholder="Select time block" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-background border-[#E5E0DC]">
                  {timeBlocks.map((block) => (
                    <SelectItem key={block} value={block}>
                      {block}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={newTask.category} 
                onValueChange={(value: string) => handleSelectChange("category", value)}
              >
                <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-kalos-text">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-background border-[#E5E0DC]">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select 
                value={newTask.priority} 
                onValueChange={(value: string) => handleSelectChange("priority", value as TaskPriority)}
              >
                <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-kalos-text">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-background border-[#E5E0DC]">
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Recurrence</label>
            <Select 
              value={newTask.recurrencePattern} 
              onValueChange={(value: string) => handleSelectChange("recurrencePattern", value as RecurrencePattern)}
            >
              <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-kalos-text">
                <SelectValue placeholder="Select recurrence" />
              </SelectTrigger>
              <SelectContent className="bg-kalos-background border-[#E5E0DC]">
                {recurrences.map((recurrence) => (
                  <SelectItem key={recurrence} value={recurrence}>
                    {recurrence}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <button 
            onClick={() => onOpenChange(false)} 
            className="px-4 py-2 text-kalos-secondary text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTask}
            className="px-4 py-2 bg-kalos-text text-white rounded-md text-sm font-medium"
            disabled={!newTask.name}
          >
            Create Task
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}