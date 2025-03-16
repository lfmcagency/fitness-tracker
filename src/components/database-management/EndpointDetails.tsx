"use client"

import { Check, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Endpoint, EndpointStatus } from "./DatabaseManagement"

interface EndpointDetailsProps {
  endpoint: Endpoint
  onTestEndpoint: (path: string, method: string) => void
}

export function EndpointDetails({ endpoint, onTestEndpoint }: EndpointDetailsProps) {
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

      <div>
        <h4 className="text-sm font-medium mb-3">Routes</h4>
        <div className="space-y-3">
          {endpoint.routes.length > 0 ? (
            endpoint.routes.map((route, index) => (
              <div key={index} className="p-3 border border-[#E5E0DC] rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-xs font-medium px-2 py-1 bg-[#E5E0DC] rounded-md mr-2">
                      {route.method}
                    </span>
                    <span className="text-sm font-medium">{route.path}</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", getStatusColor(route.status))}></div>
                </div>
                <div className="flex justify-between text-xs text-[#6B6B6B]">
                  <span>Status: {getStatusText(route.status)}</span>
                  <span>Response time: {route.responseTime}ms</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6B6B6B] py-2">No routes available for this endpoint.</p>
          )}
          
          {/* Display common routes if no specific routes are defined */}
          {endpoint.routes.length === 0 && (
            <>
              <div className="p-3 border border-[#E5E0DC] rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-xs font-medium px-2 py-1 bg-[#E5E0DC] rounded-md mr-2">
                      GET
                    </span>
                    <span className="text-sm font-medium">{`/api/${endpoint.name}`}</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", getStatusColor("unknown"))}></div>
                </div>
                <div className="flex justify-between text-xs text-[#6B6B6B]">
                  <span>Status: {getStatusText("unknown")}</span>
                  <span>Response time: --</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Actions</h4>
        <div className="flex space-x-3">
          <button 
            className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md"
            onClick={() => {
              // Test the first route or a default route if none exist
              const routeToTest = endpoint.routes.length > 0 
                ? endpoint.routes[0] 
                : { path: `/api/${endpoint.name}`, method: "GET" }
                
              onTestEndpoint(routeToTest.path, routeToTest.method)
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