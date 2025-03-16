"use client"

import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatabaseHealthSummaryProps {
  healthyCount: number
  degradedCount: number
  failingCount: number
  totalEndpoints: number
  refreshing: boolean
  onRefresh: () => void
}

export function DatabaseHealthSummary({
  healthyCount,
  degradedCount,
  failingCount,
  totalEndpoints,
  refreshing,
  onRefresh
}: DatabaseHealthSummaryProps) {
  // Calculate health percentage
  const healthPercentage = totalEndpoints === 0 ? 0 : Math.round((healthyCount / totalEndpoints) * 100)

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-light tracking-wide">Kalos</h1>
        <button
          className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2">Database Health</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-[#7D8F69] mr-2"></div>
            <span>{healthyCount} healthy</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-[#A4907C] mr-2"></div>
            <span>{degradedCount} degraded</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-[#B85C38] mr-2"></div>
            <span>{failingCount} failing</span>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#6B6B6B]">Overall Health</span>
          <span className="text-sm font-medium">{healthPercentage}%</span>
        </div>
        <div className="h-1 bg-[#E5E0DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>
    </>
  )
}