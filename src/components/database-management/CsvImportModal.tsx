"use client"

import { useState, useRef, useEffect } from "react"
import { FileUp, ChevronDown, AlertCircle, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"



interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void;
  availableFiles: { name: string; path: string; size: number; type: string; }[];
  availableModels: string[];
  onImport: () => void;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onImport
}: CsvImportModalProps) {
  const [fileName, setFileName] = useState<string>("")
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [importMode, setImportMode] = useState<'single' | 'all'>('single')
  const [importResult, setImportResult] = useState<{success: boolean; message: string} | null>(null)
  const [replaceData, setReplaceData] = useState<boolean>(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFileName("")
      setIsUploading(false)
      setImportResult(null)
    }
  }, [isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleImport = async () => {
    setIsUploading(true)
    setImportResult(null)
    
    try {
      // Simple import options
      const importData = {
        collection: "exercises",
        fileName: importMode === 'all' ? null : fileName,
        options: {
          overwrite: replaceData,
          upsert: true,
          batch: true,
          modelSpecific: true,
          importAllExercises: importMode === 'all'
        }
      }
      
      // Send request to the import endpoint
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      })
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Import failed')
      }
      
      const result = await response.json()
      console.log('Import result:', result)
      
      // Show success message
      setImportResult({
        success: true,
        message: `Successfully imported exercises! Created: ${result.data?.results?.created || 0}, Updated: ${result.data?.results?.updated || 0}`
      })
      
      // Notify parent component
      onImport()
    } catch (err) {
      console.error('Import error:', err)
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to import CSV data'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC] p-6 max-w-[350px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Import Exercise Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Import mode selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Import Mode</label>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <button 
                  className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${importMode === 'single' ? 'border-[#1A1A1A]' : ''}`}
                  onClick={() => setImportMode('single')}
                >
                  {importMode === 'single' && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
                </button>
                <span className="text-sm">Import single file</span>
              </div>
              <div className="flex items-center">
                <button 
                  className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${importMode === 'all' ? 'border-[#1A1A1A]' : ''}`}
                  onClick={() => setImportMode('all')}
                >
                  {importMode === 'all' && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
                </button>
                <span className="text-sm">Import all exercise files</span>
              </div>
            </div>
          </div>

          {/* File selection - only show if single file mode */}
          {importMode === 'single' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <div className="flex">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter filename (e.g., core-exercises.csv)"
                  className="flex-1 px-4 py-2 border border-[#E5E0DC] rounded-l-md bg-transparent focus:outline-none"
                />
                <button
                  className="px-3 py-2 bg-[#1A1A1A] text-white rounded-r-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
              </div>
              <p className="text-xs text-[#6B6B6B]">
                Enter the CSV filename from the /data/ directory or browse to select
              </p>
            </div>
          )}

          {/* Import options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Import Options</label>
            <div className="flex items-center">
              <button 
                className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${replaceData ? 'border-[#1A1A1A]' : ''}`}
                onClick={() => setReplaceData(true)}
              >
                {replaceData && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
              </button>
              <span className="text-sm">Replace existing exercises</span>
            </div>
            <div className="flex items-center">
              <button 
                className={`w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center ${!replaceData ? 'border-[#1A1A1A]' : ''}`}
                onClick={() => setReplaceData(false)}
              >
                {!replaceData && <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>}
              </button>
              <span className="text-sm">Only add new exercises</span>
            </div>
          </div>

          {/* Import result message */}
          {importResult && (
            <div className={`p-3 rounded-md ${importResult.success ? 'bg-[#7D8F69]/20' : 'bg-[#B85C38]/20'}`}>
              <div className="flex items-start">
                {importResult.success ? (
                  <Check className="w-5 h-5 text-[#7D8F69] mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[#B85C38] mr-2 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{importResult.message}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-[#6B6B6B] text-sm font-medium"
            disabled={isUploading}
          >
            {importResult?.success ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium"
            disabled={isUploading || (importMode === 'single' && !fileName)}
          >
            {isUploading ? 'Importing...' : 'Import Exercises'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}