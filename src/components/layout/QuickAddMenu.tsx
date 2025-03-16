"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Dumbbell, Apple, CheckSquare, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface QuickAddMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function QuickAddMenu({ isOpen, onClose }: QuickAddMenuProps) {
  const router = useRouter()
  
  const handleOption = (path: string) => {
    router.push(path)
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC] p-4 max-w-[300px] rounded-lg">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-[#6B6B6B]" />
          </button>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleOption("/training/create")}
            className="w-full flex items-center p-3 rounded-md hover:bg-[#E5E0DC] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Create Workout</h3>
              <p className="text-sm text-[#6B6B6B]">Start a new training session</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleOption("/nutrition/add-meal")}
            className="w-full flex items-center p-3 rounded-md hover:bg-[#E5E0DC] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
              <Apple className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Log Meal</h3>
              <p className="text-sm text-[#6B6B6B]">Record your nutrition</p>
            </div>
          </button>
          
          <button 
            onClick={() => handleOption("/routine/add-task")}
            className="w-full flex items-center p-3 rounded-md hover:bg-[#E5E0DC] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mr-4">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Add Task</h3>
              <p className="text-sm text-[#6B6B6B]">Create a new task or habit</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}