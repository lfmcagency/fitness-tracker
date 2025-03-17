"use client"

import { FileUp, Database } from "lucide-react"

interface DatabaseActionsProps {
  onImport: () => void
  onInitDb: () => void
  refreshing: boolean
}

export function DatabaseActions({ onImport, onInitDb, refreshing }: DatabaseActionsProps) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-medium mb-3">Database Actions</h3>
      <div className="flex space-x-3">
        <button
          className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md flex items-center"
          onClick={onImport}
          disabled={refreshing}
        >
          <FileUp className="w-4 h-4 mr-2" />
          Import CSV
        </button>
        <button
          className="px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm rounded-md flex items-center"
          onClick={onInitDb}
          disabled={refreshing}
        >
          <Database className="w-4 h-4 mr-2" />
          Init DB
        </button>
      </div>
    </div>
  )
}