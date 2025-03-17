"use client"

import { useState, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Endpoint, EndpointStatus } from "./DatabaseManagement"

interface EndpointSelectorProps {
  endpoints: Endpoint[]
  selectedEndpoint: Endpoint | null
  onSelect: (endpoint: Endpoint) => void
}

export function EndpointSelector({ endpoints, selectedEndpoint, onSelect }: EndpointSelectorProps) {
  const [open, setOpen] = useState(false)

  // Group endpoints by domain
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, Endpoint[]> = {}
    
    endpoints.forEach(endpoint => {
      const domain = endpoint.domain || 'Other'
      if (!groups[domain]) {
        groups[domain] = []
      }
      groups[domain].push(endpoint)
    })
    
    // Get domains in specific order
    const domainOrder = [
      'Database & System Management',
      'Authentication & User Management',
      'Task Management',
      'Exercise & Training System',
      'Nutrition System',
      'Progress & Achievements',
      'Other'
    ]
    
    // Return sorted entries
    return Object.entries(groups).sort((a, b) => {
      const indexA = domainOrder.indexOf(a[0])
      const indexB = domainOrder.indexOf(b[0])
      return indexA - indexB
    })
  }, [endpoints])

  const getStatusColor = (status: EndpointStatus) => {
    switch (status) {
      case "healthy":
        return "bg-[#7D8F69]"
      case "degraded":
        return "bg-[#A4907C]"
      case "failing":
        return "bg-[#B85C38]"
      default:
        return "bg-[#6B6B6B]"
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full px-4 py-3 border border-[#E5E0DC] rounded-md flex items-center justify-between bg-transparent text-left">
          <span>{selectedEndpoint ? selectedEndpoint.name : "Select endpoint"}</span>
          <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-[#F7F3F0] border-[#E5E0DC]">
        <div className="py-1 max-h-[300px] overflow-y-auto">
          {groupedEndpoints.map(([domain, domainEndpoints]) => (
            <div key={domain} className="mb-2">
              <div className="px-4 py-1 text-xs font-semibold text-[#6B6B6B] bg-[#F0EAE4] uppercase tracking-wider">
                {domain}
              </div>
              {domainEndpoints.map((endpoint) => (
                <button
                  key={endpoint.name}
                  className="w-full px-4 py-2 text-left hover:bg-[#E5E0DC] flex items-center justify-between"
                  onClick={() => {
                    onSelect(endpoint)
                    setOpen(false)
                  }}
                >
                  <span>{endpoint.name}</span>
                  <div className={cn("w-2 h-2 rounded-full", getStatusColor(endpoint.status))}></div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}