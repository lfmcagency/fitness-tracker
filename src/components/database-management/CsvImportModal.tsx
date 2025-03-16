"use client"

import { useState, useRef } from "react"
import { FileUp, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
  availableFiles: { name: string; path: string; size: number; type: string }[]
  availableModels: string[]
  onImport: () => void
}

export function CsvImportModal({
  isOpen,
  onClose,
  availableFiles,
  availableModels,
  onImport
}: CsvImportModalProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [replaceData, setReplaceData] = useState<boolean>(true)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [endpointDropdownOpen, setEndpointDropdownOpen] = useState(false)
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle file selection from browse files
    if (e.target.files && e.target.files.length > 0) {
      // For now, just log the file - in a real app, you'd upload/process it
      console.log("Selected file:", e.target.files[0].name)
      // Set selected file name for display
      setSelectedFile(e.target.files[0].name)
    }
  }

  const handleImport = async () => {
    if (!selectedEndpoint || !selectedFile) {
      alert("Please select both a target endpoint and a file.")
      return
    }

    setIsUploading(true)
    try {
      // For existing files from the server
      const fileToImport = availableFiles.find(f => f.name === selectedFile)
      
      // Prepare import options
      const importData = {
        collection: selectedEndpoint,
        fileName: fileToImport?.name,
        options: {
          overwrite: replaceData,
          upsert: true,
          batch: true
        }
      }
      
      // Send import request
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Import failed')
      }
      
      alert('CSV data imported successfully')
      onImport()
    } catch (err) {
      console.error('Import error:', err)
      alert(err instanceof Error ? err.message : 'Failed to import CSV data')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC] p-6 max-w-[350px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Import CSV Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Endpoint</label>
            <Popover open={endpointDropdownOpen} onOpenChange={setEndpointDropdownOpen}>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-3 border border-[#E5E0DC] rounded-md flex items-center justify-between bg-transparent text-left">
                  <span>{selectedEndpoint || "Select target endpoint"}</span>
                  <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-[#F7F3F0] border-[#E5E0DC]">
                <div className="py-1 max-h-[200px] overflow-y-auto">
                  {availableModels.map((model) => (
                    <button 
                      key={model} 
                      className="w-full px-4 py-2 text-left hover:bg-[#E5E0DC]"
                      onClick={() => {
                        setSelectedEndpoint(model)
                        setEndpointDropdownOpen(false)
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* File selection - two options: select from available or upload new */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select File</label>
            <Popover open={fileDropdownOpen} onOpenChange={setFileDropdownOpen}>
              <PopoverTrigger asChild>
                <button className="w-full px-4 py-3 border border-[#E5E0DC] rounded-md flex items-center justify-between bg-transparent text-left">
                  <span>{selectedFile || "Select CSV file"}</span>
                  <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-[#F7F3F0] border-[#E5E0DC]">
                <div className="py-1 max-h-[200px] overflow-y-auto">
                  {availableFiles.map((file) => (
                    <button 
                      key={file.name} 
                      className="w-full px-4 py-2 text-left hover:bg-[#E5E0DC]"
                      onClick={() => {
                        setSelectedFile(file.name)
                        setFileDropdownOpen(false)
                      }}
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload File</label>
            <div 
              className="border-2 border-dashed border-[#E5E0DC] rounded-md p-6 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="w-8 h-8 text-[#6B6B6B] mx-auto mb-2" />
              <p className="text-sm text-[#6B6B6B] mb-2">Drag and drop your CSV file here</p>
              <button className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md">
                Browse Files
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="flex items-center">
              <button 
                className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${replaceData ? 'border-[#1A1A1A]' : ''}`}
                onClick={() => setReplaceData(true)}
              >
                {replaceData && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
              </button>
              <span className="text-sm">Replace existing data</span>
            </div>
            <div className="flex items-center">
              <button 
                className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${!replaceData ? 'border-[#1A1A1A]' : ''}`}
                onClick={() => setReplaceData(false)}
              >
                {!replaceData && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
              </button>
              <span className="text-sm">Append to existing data</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-[#6B6B6B] text-sm font-medium"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium"
            disabled={isUploading || !selectedEndpoint || !selectedFile}
          >
            {isUploading ? 'Importing...' : 'Import'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}