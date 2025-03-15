"use client"

import type React from "react"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Filter, Flame, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

type Task = {
  id: number
  name: string
  completed: boolean
  time: string
  category: string
  streak: number
  priority: string
  recurrence: string
  description: string
  timeBlock: string
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      name: "Morning meditation",
      completed: true,
      time: "07:30",
      category: "Nous",
      streak: 7,
      priority: "medium",
      recurrence: "daily",
      description: "10 minutes of mindfulness practice",
      timeBlock: "Morning",
    },
    {
      id: 2,
      name: "Strength training",
      completed: false,
      time: "08:15",
      category: "Soma",
      streak: 12,
      priority: "high",
      recurrence: "weekdays",
      description: "Focus on upper body and core",
      timeBlock: "Morning",
    },
    {
      id: 3,
      name: "Prepare nutritious lunch",
      completed: false,
      time: "12:00",
      category: "Trophe",
      streak: 5,
      priority: "medium",
      recurrence: "daily",
      description: "High protein, balanced macros",
      timeBlock: "Afternoon",
    },
    {
      id: 4,
      name: "Project planning session",
      completed: false,
      time: "14:30",
      category: "Nous",
      streak: 3,
      priority: "high",
      recurrence: "weekdays",
      description: "Strategic planning for work project",
      timeBlock: "Afternoon",
    },
    {
      id: 5,
      name: "Evening walk",
      completed: false,
      time: "18:45",
      category: "Soma",
      streak: 9,
      priority: "low",
      recurrence: "daily",
      description: "30 minutes at moderate pace",
      timeBlock: "Evening",
    },
    {
      id: 6,
      name: "Reading session",
      completed: false,
      time: "21:00",
      category: "Nous",
      streak: 15,
      priority: "medium",
      recurrence: "daily",
      description: "Current book: The Art of Living",
      timeBlock: "Evening",
    },
  ])

  const [date, setDate] = useState<Date>(new Date())
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState<Partial<Task>>({
    name: "",
    description: "",
    time: "",
    category: "Nous",
    priority: "medium",
    recurrence: "daily",
    timeBlock: "Morning",
  })
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const completedTasksCount = tasks.filter((task) => task.completed).length
  const completionPercentage = Math.round((completedTasksCount / tasks.length) * 100)

  const toggleTaskCompletion = (id: number) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-[#B85C38]"
      case "medium":
        return "text-[#A4907C]"
      case "low":
        return "text-[#7D8F69]"
      default:
        return "text-[#A4907C]"
    }
  }

  const timeBlocks = ["Morning", "Afternoon", "Evening"]
  const categories = ["Nous", "Soma", "Trophe"]
  const priorities = ["high", "medium", "low"]
  const recurrences = ["daily", "weekdays", "custom"]

  const handleCreateTask = () => {
    if (!newTask.name) return

    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1
    const task: Task = {
      id,
      name: newTask.name || "",
      description: newTask.description || "",
      time: newTask.time || "12:00",
      category: newTask.category || "Nous",
      priority: newTask.priority || "medium",
      recurrence: newTask.recurrence || "daily",
      timeBlock: newTask.timeBlock || "Morning",
      completed: false,
      streak: 0,
    }

    setTasks([...tasks, task])
    setNewTask({
      name: "",
      description: "",
      time: "",
      category: "Nous",
      priority: "medium",
      recurrence: "daily",
      timeBlock: "Morning",
    })
    setCreateTaskOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewTask({ ...newTask, [name]: value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewTask({ ...newTask, [name]: value })
  }

  const filterOptions = [
    { id: "completed", label: "Completed" },
    { id: "incomplete", label: "Incomplete" },
    { id: "high", label: "High Priority" },
    { id: "medium", label: "Medium Priority" },
    { id: "low", label: "Low Priority" },
    { id: "nous", label: "Nous" },
    { id: "soma", label: "Soma" },
    { id: "trophe", label: "Trophe" },
  ]

  const toggleFilter = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      setActiveFilters(activeFilters.filter((id) => id !== filterId))
    } else {
      setActiveFilters([...activeFilters, filterId])
    }
  }

  const filterTasks = (task: Task) => {
    if (activeFilters.length === 0) return true

    return activeFilters.some((filter) => {
      switch (filter) {
        case "completed":
          return task.completed
        case "incomplete":
          return !task.completed
        case "high":
          return task.priority === "high"
        case "medium":
          return task.priority === "medium"
        case "low":
          return task.priority === "low"
        case "nous":
          return task.category === "Nous"
        case "soma":
          return task.category === "Soma"
        case "trophe":
          return task.category === "Trophe"
        default:
          return true
      }
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A] max-w-[390px] mx-auto">
      {/* Header */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-light tracking-wide">Kalos</h1>
          <button
            className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center"
            onClick={() => setCreateTaskOpen(true)}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button className="p-2">
            <ChevronLeft className="w-5 h-5 text-[#6B6B6B]" />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-base font-medium hover:opacity-80 transition-opacity">
                {format(date, "MMMM d, yyyy") === format(new Date(), "MMMM d, yyyy")
                  ? "Today"
                  : format(date, "MMMM d, yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#F7F3F0] border-[#E5E0DC]">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                className="rounded-md bg-[#F7F3F0]"
              />
            </PopoverContent>
          </Popover>
          <button className="p-2">
            <ChevronRight className="w-5 h-5 text-[#6B6B6B]" />
          </button>
        </div>

        <div className="mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#6B6B6B]">Progress</span>
            <span className="text-sm font-medium">{completionPercentage}%</span>
          </div>
          <div className="h-1 bg-[#E5E0DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-20">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-medium">Tasks</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center text-[#6B6B6B] text-sm hover:opacity-80 transition-opacity">
                Filters <Filter className="ml-1 w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 bg-[#F7F3F0] border-[#E5E0DC]">
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">Filter by:</h3>
                {filterOptions.map((option) => (
                  <div key={option.id} className="flex items-center">
                    <button
                      onClick={() => toggleFilter(option.id)}
                      className={cn(
                        "w-4 h-4 rounded-sm mr-2 border transition-colors",
                        activeFilters.includes(option.id) ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-[#6B6B6B]",
                      )}
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-8">
          {timeBlocks.map((timeBlock) => {
            const filteredTasks = tasks.filter((task) => task.timeBlock === timeBlock && filterTasks(task))

            if (filteredTasks.length === 0) return null

            return (
              <div key={timeBlock}>
                <h3 className="text-[#6B6B6B] text-sm font-medium mb-4">{timeBlock}</h3>
                <div className="space-y-6">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="flex items-start">
                      <button
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={cn(
                          "w-6 h-6 rounded-full border flex-shrink-0 mr-4 mt-1",
                          "flex items-center justify-center transition-all duration-200",
                          task.completed ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-[#6B6B6B] bg-transparent",
                        )}
                      >
                        {task.completed && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={cn("text-base font-normal", task.completed && "line-through text-[#6B6B6B]")}>
                            {task.name}
                          </h4>
                          <div className="flex items-center">
                            <div className="flex items-center mr-2">
                              <Flame className="w-3.5 h-3.5 text-[#B85C38] mr-1" />
                              <span className="text-xs">{task.streak}</span>
                            </div>
                            <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-[#6B6B6B] mb-1">{task.description}</p>

                        <div className="flex items-center text-xs text-[#6B6B6B]">
                          <span className="mr-2">{task.time}</span>
                          <span className="mr-2">•</span>
                          <span className="mr-2">{task.category}</span>
                          <span className="mr-2">•</span>
                          <span>{task.recurrence}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Create Task Dialog */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC] p-6 max-w-[350px] rounded-lg">
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
                value={newTask.name || ""}
                onChange={handleInputChange}
                className="bg-transparent border-[#E5E0DC] focus-visible:ring-[#1A1A1A]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={newTask.description || ""}
                onChange={handleInputChange}
                className="bg-transparent border-[#E5E0DC] focus-visible:ring-[#1A1A1A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="time">
                  Time
                </label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={newTask.time || ""}
                  onChange={handleInputChange}
                  className="bg-transparent border-[#E5E0DC] focus-visible:ring-[#1A1A1A]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Time Block</label>
                <Select value={newTask.timeBlock} onValueChange={(value) => handleSelectChange("timeBlock", value)}>
                  <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-[#1A1A1A]">
                    <SelectValue placeholder="Select time block" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F7F3F0] border-[#E5E0DC]">
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
                <Select value={newTask.category} onValueChange={(value) => handleSelectChange("category", value)}>
                  <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-[#1A1A1A]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F7F3F0] border-[#E5E0DC]">
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
                <Select value={newTask.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                  <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-[#1A1A1A]">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#F7F3F0] border-[#E5E0DC]">
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
              <Select value={newTask.recurrence} onValueChange={(value) => handleSelectChange("recurrence", value)}>
                <SelectTrigger className="bg-transparent border-[#E5E0DC] focus:ring-[#1A1A1A]">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent className="bg-[#F7F3F0] border-[#E5E0DC]">
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
            <button onClick={() => setCreateTaskOpen(false)} className="px-4 py-2 text-[#6B6B6B] text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium"
              disabled={!newTask.name}
            >
              Create Task
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

