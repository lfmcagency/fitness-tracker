// src/components/domains/admin/FoodImport.tsx
"use client"

import { useState, useRef } from 'react'
import { useAdminStore } from '@/store/admin'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUp, Check } from 'lucide-react'

export function FoodImport() {
  const { 
    importProgress, 
    error, 
    importFoods, 
    clearError, 
    clearImportResults 
  } = useAdminStore()
  
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const foodStatus = importProgress.foods
  const isLoading = foodStatus.loading
  const result = foodStatus.result

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return
    }
    importFoods(file)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Food Import</h2>
        {result && (
          <Button variant="ghost" size="sm" onClick={clearImportResults}>
            Clear Results
          </Button>
        )}
      </div>

      {error && (
        <Card className="p-4 bg-[#B85C38]/10 border-[#B85C38]/20">
          <div className="flex items-center justify-between">
            <span className="text-[#B85C38] text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      <Card 
        className={`p-8 border-2 border-dashed transition-colors ${
          dragActive 
            ? 'border-[#1A1A1A] bg-[#F0EAE4]' 
            : 'border-[#E5E0DC] hover:border-[#A4907C]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {isLoading ? (
            <div>
              <div className="animate-spin w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Importing foods...</h3>
              <p className="text-[#6B6B6B]">Please wait while we process your CSV file</p>
            </div>
          ) : result ? (
            <div>
              <Check className="w-8 h-8 text-[#7D8F69] mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Import Complete</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                <div className="text-center">
                  <div className="font-medium">{result.created}</div>
                  <div className="text-[#6B6B6B]">Created</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{result.updated}</div>
                  <div className="text-[#6B6B6B]">Updated</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{result.total}</div>
                  <div className="text-[#6B6B6B]">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">{result.errors.length}</div>
                  <div className="text-[#6B6B6B]">Errors</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <FileUp className="w-8 h-8 text-[#6B6B6B] mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Food CSV</h3>
              <p className="text-[#6B6B6B] mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="mb-2"
              >
                Choose File
              </Button>
              <p className="text-xs text-[#6B6B6B]">
                CSV should include: name, protein, carbs, fats, calories
              </p>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
      </Card>
    </div>
  )
}