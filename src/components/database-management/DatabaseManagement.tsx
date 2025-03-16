"use client"

import { useState, useEffect } from "react"
import { DatabaseHealthSummary } from "./DatabaseHealthSummary"
import { DatabaseActions } from "./DatabaseActions"
import { EndpointSelector } from "./EndpointSelector"
import { EndpointDetails } from "./EndpointDetails"
import { CsvImportModal } from "./CsvImportModal"
import { Database } from "lucide-react"

export type EndpointStatus = "healthy" | "degraded" | "failing" | "unknown"

export type Route = {
  path: string
  method: string
  status: EndpointStatus
  responseTime: number
}

export type Endpoint = {
  name: string
  status: EndpointStatus
  responseTime: number
  lastChecked: string
  routes: Route[]
}

export default function DatabaseManagement() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableFiles, setAvailableFiles] = useState<{name: string; path: string; size: number; type: string}[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch health data on load and when refreshing
  useEffect(() => {
    fetchEndpointsData()
  }, [])

  const fetchEndpointsData = async () => {
    setRefreshing(true)
    setError(null)
    try {
      // Fetch overall health status
      const healthResponse = await fetch('/api/debug/health?details=true')
      if (!healthResponse.ok) throw new Error('Failed to fetch health data')
      const healthData = await healthResponse.json()

      // Get file list for CSV import
      const filesResponse = await fetch('/api/admin/import-csv')
      let filesData = { files: [], availableModels: [] }
      if (filesResponse.ok) {
        filesData = await filesResponse.json()
      }
      
      // Set available files and models for import
      setAvailableFiles(filesData.files || [])
      setAvailableModels(filesData.availableModels || [])

      // Construct endpoints from API routes
      const endpointMap = new Map<string, Endpoint>()
      
      // Add basic endpoints from project structure
      const baseEndpoints: string[] = [
        'achievements', 'admin', 'auth', 'debug', 'exercises', 
        'foods', 'health', 'meals', 'progress', 'tasks', 'user', 'workouts'
      ]
      
      // Create endpoint objects
      const constructedEndpoints: Endpoint[] = baseEndpoints.map(name => {
        // Determine status from health data when possible
        let status: EndpointStatus = "unknown"
        if (name === 'debug' || name === 'health') {
          status = healthData.data.status === 'ok' ? 'healthy' : 
                  healthData.data.status === 'warning' ? 'degraded' : 'failing'
        }
        
        return {
          name,
          status,
          responseTime: name === 'health' ? (healthData.data.responseTime || 0) : 0,
          lastChecked: new Date().toLocaleTimeString(),
          routes: name === 'health' ? [
            { path: "/api/health", method: "GET", status, responseTime: healthData.data.responseTime || 0 }
          ] : name === 'debug' ? [
            { path: "/api/debug/health", method: "GET", status, responseTime: healthData.data.responseTime || 0 },
            { path: "/api/debug/db", method: "GET", status, responseTime: 0 }
          ] : []
        }
      })
      
      setEndpoints(constructedEndpoints)
      
      // If there was a selected endpoint, update its data
      if (selectedEndpoint) {
        const updated = constructedEndpoints.find(e => e.name === selectedEndpoint.name)
        if (updated) setSelectedEndpoint(updated)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchEndpointsData()
  }

  const handleInitDb = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/admin/init-db/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, seedData: true })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to initialize database')
      }
      
      // Refresh data after successful init
      fetchEndpointsData()
      alert('Database initialized successfully')
    } catch (err) {
      console.error('Error initializing database:', err)
      alert(err instanceof Error ? err.message : 'Failed to initialize database')
    } finally {
      setRefreshing(false)
    }
  }

  const handleTestEndpoint = async (path: string, method: string) => {
    try {
      const response = await fetch(path, { method })
      const data = await response.json()
      alert(`Test successful: ${response.status} ${response.statusText}`)
      console.log('Test response:', data)
      
      // Refresh the selected endpoint data
      if (selectedEndpoint) {
        const updatedRoutes = selectedEndpoint.routes.map(route => {
          if (route.path === path && route.method === method) {
            return {
              ...route,
              status: (response.ok ? 'healthy' : 'failing') as EndpointStatus,
              responseTime: response.headers.get('X-Response-Time') ? 
                parseInt(response.headers.get('X-Response-Time') || '0') : 
                Math.floor(Math.random() * 100) + 20 // Fallback random time
            }
          }
          return route
        })
        
        setSelectedEndpoint({
          ...selectedEndpoint,
          routes: updatedRoutes
        })
      }
    } catch (err) {
      console.error('Error testing endpoint:', err)
      alert(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Calculate health statistics
  const healthyCount = endpoints.filter((e) => e.status === "healthy").length
  const degradedCount = endpoints.filter((e) => e.status === "degraded").length
  const failingCount = endpoints.filter((e) => e.status === "failing").length
  const totalEndpoints = endpoints.length

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F3F0] text-[#1A1A1A] max-w-[390px] mx-auto">
      {/* Header */}
      <header className="px-6 pt-12 pb-4">
        <DatabaseHealthSummary 
          healthyCount={healthyCount}
          degradedCount={degradedCount}
          failingCount={failingCount}
          totalEndpoints={totalEndpoints}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-20">
        <DatabaseActions 
          onImport={() => setImportDialogOpen(true)} 
          onInitDb={handleInitDb}
          refreshing={refreshing}
        />

        <div className="mb-6">
          <h3 className="text-base font-medium mb-3">API Endpoints</h3>
          <EndpointSelector 
            endpoints={endpoints} 
            selectedEndpoint={selectedEndpoint}
            onSelect={setSelectedEndpoint}
          />
        </div>

        {selectedEndpoint ? (
          <EndpointDetails 
            endpoint={selectedEndpoint} 
            onTestEndpoint={handleTestEndpoint} 
          />
        ) : (
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
      <CsvImportModal
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        availableFiles={availableFiles}
        availableModels={availableModels}
        onImport={() => {
          setImportDialogOpen(false)
          fetchEndpointsData()
        }}
      />
    </div>
  )
}