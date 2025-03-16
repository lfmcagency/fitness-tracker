"use client"

import { useMemo } from "react"
import { Check, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Endpoint, EndpointStatus, Route } from "./DatabaseManagement"

interface EndpointDetailsProps {
  endpoint: Endpoint
  onTestEndpoint: (path: string, method: string) => void
}

export function EndpointDetails({ endpoint, onTestEndpoint }: EndpointDetailsProps) {
  // Group routes by base path
  const groupedRoutes = useMemo(() => {
    const groups: Record<string, Route[]> = {}
    
    endpoint.routes.forEach(route => {
      // Extract the base path (e.g., /api/tasks/[id] -> /api/tasks)
      const pathParts = route.path.split('/')
      const basePath = pathParts.length > 3 
        ? `/${pathParts[1]}/${pathParts[2]}`
        : route.path
        
      if (!groups[basePath]) {
        groups[basePath] = []
      }
      groups[basePath].push(route)
    })
    
    return Object.entries(groups)
  }, [endpoint.routes])

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

  const getStatusText = (status: EndpointStatus) => {
    switch (status) {
      case "healthy":
        return "Healthy"
      case "degraded":
        return "Degraded"
      case "failing":
        return "Failing"
      default:
        return "Unknown"
    }
  }

  const getStatusIcon = (status: EndpointStatus) => {
    switch (status) {
      case "healthy":
        return <Check className="w-4 h-4 text-[#7D8F69]" />
      case "degraded":
        return <RefreshCw className="w-4 h-4 text-[#A4907C]" />
      case "failing":
        return <X className="w-4 h-4 text-[#B85C38]" />
      default:
        return null
    }
  }

  // Count routes by status
  const statusCounts = useMemo(() => {
    return endpoint.routes.reduce((counts, route) => {
      counts[route.status] = (counts[route.status] || 0) + 1
      return counts
    }, {} as Record<EndpointStatus, number>)
  }, [endpoint.routes])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium">{endpoint.name}</h3>
          <p className="text-sm text-[#6B6B6B]">Last checked: {endpoint.lastChecked}</p>
        </div>
        <div className="flex items-center">
          {getStatusIcon(endpoint.status)}
          <span className="ml-2 text-sm">{getStatusText(endpoint.status)}</span>
        </div>
      </div>

      {/* Status summary */}
      <div className="bg-[#F0EAE4] rounded-md p-3">
        <h4 className="text-sm font-medium mb-2">Status Summary</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex flex-col items-center p-2 bg-white rounded">
            <span className="font-medium">Total</span>
            <span>{endpoint.routes.length}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white rounded">
            <span className="font-medium text-[#7D8F69]">Healthy</span>
            <span>{statusCounts.healthy || 0}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white rounded">
            <span className="font-medium text-[#A4907C]">Degraded</span>
            <span>{statusCounts.degraded || 0}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-white rounded">
            <span className="font-medium text-[#B85C38]">Failing</span>
            <span>{statusCounts.failing || 0}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Routes</h4>
        <div className="space-y-4">
          {groupedRoutes.map(([basePath, routes]) => (
            <div key={basePath} className="space-y-2">
              <h5 className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider">
                {basePath}
              </h5>
              <div className="space-y-2">
                {routes.map((route, index) => (
                  <div key={index} className="p-3 border border-[#E5E0DC] rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <span className="text-xs font-medium px-2 py-1 bg-[#E5E0DC] rounded-md mr-2">
                          {route.method}
                        </span>
                        <span className="text-sm font-medium">{route.path}</span>
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(route.status))}></div>
                    </div>
                    {route.description && (
                      <p className="text-xs text-[#6B6B6B] mb-2">{route.description}</p>
                    )}
                    <div className="flex justify-between text-xs text-[#6B6B6B]">
                      <span>Status: {getStatusText(route.status)}</span>
                      <span>Response time: {route.responseTime}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Actions</h4>
        <div className="flex space-x-3">
          <button 
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md"
            onClick={() => {
              // Test the first testable route or a default route
              const testableRoute = endpoint.routes.find(r => 
                r.method === 'GET' && !r.path.includes('[') && !r.path.includes(']')
              )
              
              if (testableRoute) {
                onTestEndpoint(testableRoute.path, testableRoute.method)
              } else {
                alert("No testable routes available. This endpoint may require parameters or a request body.")
              }
            }}
          >
            Test Endpoint
          </button>
          <button className="px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm rounded-md">
            View Logs
          </button>
        </div>
      </div>
    </div>
  )
}