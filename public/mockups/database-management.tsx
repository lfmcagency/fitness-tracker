"use client"

import { useState } from "react"
import { Check, ChevronDown, Database, FileUp, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type EndpointStatus = "healthy" | "degraded" | "failing" | "unknown"

type Endpoint = {
  name: string
  status: EndpointStatus
  responseTime: number
  lastChecked: string
  routes: Route[]
}

type Route = {
  path: string
  method: string
  status: EndpointStatus
  responseTime: number
}

export default function DatabaseManagement() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    {
      name: "achievements",
      status: "healthy",
      responseTime: 42,
      lastChecked: "2 minutes ago",
      routes: [
        { path: "/api/achievements", method: "GET", status: "healthy", responseTime: 42 },
        { path: "/api/achievements/:id", method: "GET", status: "healthy", responseTime: 38 },
        { path: "/api/achievements", method: "POST", status: "healthy", responseTime: 67 },
      ],
    },
    {
      name: "auth",
      status: "healthy",
      responseTime: 56,
      lastChecked: "3 minutes ago",
      routes: [
        { path: "/api/auth/login", method: "POST", status: "healthy", responseTime: 56 },
        { path: "/api/auth/register", method: "POST", status: "healthy", responseTime: 62 },
        { path: "/api/auth/refresh", method: "POST", status: "healthy", responseTime: 48 },
      ],
    },
    {
      name: "debug database / health",
      status: "healthy",
      responseTime: 31,
      lastChecked: "1 minute ago",
      routes: [
        { path: "/api/debug/health", method: "GET", status: "healthy", responseTime: 31 },
        { path: "/api/debug/status", method: "GET", status: "healthy", responseTime: 29 },
      ],
    },
    {
      name: "exercises",
      status: "degraded",
      responseTime: 187,
      lastChecked: "5 minutes ago",
      routes: [
        { path: "/api/exercises", method: "GET", status: "healthy", responseTime: 78 },
        { path: "/api/exercises/:id", method: "GET", status: "degraded", responseTime: 187 },
        { path: "/api/exercises", method: "POST", status: "healthy", responseTime: 92 },
      ],
    },
    {
      name: "foods",
      status: "healthy",
      responseTime: 45,
      lastChecked: "4 minutes ago",
      routes: [
        { path: "/api/foods", method: "GET", status: "healthy", responseTime: 45 },
        { path: "/api/foods/:id", method: "GET", status: "healthy", responseTime: 41 },
        { path: "/api/foods", method: "POST", status: "healthy", responseTime: 73 },
      ],
    },
    {
      name: "meals",
      status: "healthy",
      responseTime: 62,
      lastChecked: "3 minutes ago",
      routes: [
        { path: "/api/meals", method: "GET", status: "healthy", responseTime: 62 },
        { path: "/api/meals/:id", method: "GET", status: "healthy", responseTime: 58 },
        { path: "/api/meals", method: "POST", status: "healthy", responseTime: 87 },
      ],
    },
    {
      name: "progress",
      status: "failing",
      responseTime: 0,
      lastChecked: "7 minutes ago",
      routes: [
        { path: "/api/progress", method: "GET", status: "failing", responseTime: 0 },
        { path: "/api/progress/:id", method: "GET", status: "failing", responseTime: 0 },
        { path: "/api/progress", method: "POST", status: "failing", responseTime: 0 },
      ],
    },
    {
      name: "tasks",
      status: "healthy",
      responseTime: 51,
      lastChecked: "2 minutes ago",
      routes: [
        { path: "/api/tasks", method: "GET", status: "healthy", responseTime: 51 },
        { path: "/api/tasks/:id", method: "GET", status: "healthy", responseTime: 47 },
        { path: "/api/tasks", method: "POST", status: "healthy", responseTime: 76 },
      ],
    },
    {
      name: "user",
      status: "healthy",
      responseTime: 49,
      lastChecked: "3 minutes ago",
      routes: [
        { path: "/api/user", method: "GET", status: "healthy", responseTime: 49 },
        { path: "/api/user/:id", method: "GET", status: "healthy", responseTime: 45 },
        { path: "/api/user", method: "POST", status: "healthy", responseTime: 74 },
      ],
    },
    {
      name: "workout",
      status: "degraded",
      responseTime: 156,
      lastChecked: "6 minutes ago",
      routes: [
        { path: "/api/workout", method: "GET", status: "healthy", responseTime: 68 },
        { path: "/api/workout/:id", method: "GET", status: "degraded", responseTime: 156 },
        { path: "/api/workout", method: "POST", status: "healthy", responseTime: 82 },
      ],
    },
  ])

  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [endpointDropdownOpen, setEndpointDropdownOpen] = useState(false)

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

  const healthyCount = endpoints.filter((e) => e.status === "healthy").length
  const degradedCount = endpoints.filter((e) => e.status === "degraded").length
  const failingCount = endpoints.filter((e) => e.status === "failing").length
  const totalEndpoints = endpoints.length

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1500)
  }

  const handleInitDb = () => {
    // Simulate database initialization
    setTimeout(() => {
      alert("Database initialized successfully")
    }, 1000)
  }

  const handleImportCsv = () => {
    setImportDialogOpen(false)
    // Simulate CSV import
    setTimeout(() => {
      alert("CSV data imported successfully")
    }, 1000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A] max-w-[390px] mx-auto">
      {/* Header */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-light tracking-wide">Kalos</h1>
          <button
            className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center"
            onClick={handleRefresh}
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
            <span className="text-sm font-medium">{Math.round((healthyCount / totalEndpoints) * 100)}%</span>
          </div>
          <div className="h-1 bg-[#E5E0DC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(healthyCount / totalEndpoints) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-20">
        <div className="mb-6">
          <h3 className="text-base font-medium mb-3">Database Actions</h3>
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md flex items-center"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import CSV
            </button>
            <button
              className="px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm rounded-md flex items-center"
              onClick={handleInitDb}
            >
              <Database className="w-4 h-4 mr-2" />
              Init DB
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-base font-medium mb-3">API Endpoints</h3>
          <Popover open={endpointDropdownOpen} onOpenChange={setEndpointDropdownOpen}>
            <PopoverTrigger asChild>
              <button className="w-full px-4 py-3 border border-[#E5E0DC] rounded-md flex items-center justify-between bg-transparent text-left">
                <span>{selectedEndpoint ? selectedEndpoint.name : "Select endpoint"}</span>
                <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-[#F7F3F0] border-[#E5E0DC]">
              <div className="py-1 max-h-[300px] overflow-y-auto">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.name}
                    className="w-full px-4 py-2 text-left hover:bg-[#E5E0DC] flex items-center justify-between"
                    onClick={() => {
                      setSelectedEndpoint(endpoint)
                      setEndpointDropdownOpen(false)
                    }}
                  >
                    <span>{endpoint.name}</span>
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(endpoint.status))}></div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {selectedEndpoint && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium">{selectedEndpoint.name}</h3>
                <p className="text-sm text-[#6B6B6B]">Last checked: {selectedEndpoint.lastChecked}</p>
              </div>
              <div className="flex items-center">
                {getStatusIcon(selectedEndpoint.status)}
                <span className="ml-2 text-sm">{getStatusText(selectedEndpoint.status)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Routes</h4>
              <div className="space-y-3">
                {selectedEndpoint.routes.map((route, index) => (
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
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Actions</h4>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md">Test Endpoint</button>
                <button className="px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm rounded-md">
                  View Logs
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedEndpoint && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="w-12 h-12 text-[#6B6B6B] mb-4" />
            <h3 className="text-base font-medium mb-2">No Endpoint Selected</h3>
            <p className="text-sm text-[#6B6B6B] max-w-[250px]">
              Select an API endpoint to view its health status and details
            </p>
          </div>
        )}
      </main>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-[#F7F3F0] border-[#E5E0DC] p-6 max-w-[350px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Import CSV Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Endpoint</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full px-4 py-3 border border-[#E5E0DC] rounded-md flex items-center justify-between bg-transparent text-left">
                    <span>Select target endpoint</span>
                    <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-[#F7F3F0] border-[#E5E0DC]">
                  <div className="py-1 max-h-[200px] overflow-y-auto">
                    {endpoints.map((endpoint) => (
                      <button key={endpoint.name} className="w-full px-4 py-2 text-left hover:bg-[#E5E0DC]">
                        {endpoint.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upload File</label>
              <div className="border-2 border-dashed border-[#E5E0DC] rounded-md p-6 text-center">
                <FileUp className="w-8 h-8 text-[#6B6B6B] mx-auto mb-2" />
                <p className="text-sm text-[#6B6B6B] mb-2">Drag and drop your CSV file here</p>
                <button className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-md">Browse Files</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center">
                <button className="w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B] flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#1A1A1A] rounded-sm"></div>
                </button>
                <span className="text-sm">Replace existing data</span>
              </div>
              <div className="flex items-center">
                <button className="w-4 h-4 rounded-sm mr-2 border border-[#6B6B6B]" />
                <span className="text-sm">Append to existing data</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <button onClick={() => setImportDialogOpen(false)} className="px-4 py-2 text-[#6B6B6B] text-sm font-medium">
              Cancel
            </button>
            <button
              onClick={handleImportCsv}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium"
            >
              Import
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

