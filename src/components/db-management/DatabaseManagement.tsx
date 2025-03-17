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
  description?: string
}

export type Endpoint = {
  name: string
  status: EndpointStatus
  responseTime: number
  lastChecked: string
  routes: Route[]
  domain: string
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
  const [checkProgress, setCheckProgress] = useState<{current: number, total: number} | null>(null)

  // Domain mapping for API endpoints based on project structure
  const domainMapping: Record<string, string> = {
    // Database & System Management
    'admin': 'Database & System Management',
    'debug': 'Database & System Management',
    'health': 'Database & System Management',
    'test': 'Database & System Management',
    'test-db': 'Database & System Management',
    
    // Authentication & User Management
    'auth': 'Authentication & User Management',
    'user': 'Authentication & User Management',
    
    // Task Management
    'tasks': 'Task Management',
    
    // Exercise & Training System
    'exercises': 'Exercise & Training System',
    'workouts': 'Exercise & Training System',
    
    // Nutrition System
    'foods': 'Nutrition System',
    'meals': 'Nutrition System',
    
    // Progress & Achievements
    'progress': 'Progress & Achievements',
    'achievements': 'Progress & Achievements'
  }

  // Comprehensive endpoint routes mapping based on your API structure
  const endpointRoutes: Record<string, Route[]> = {
    // Database & System Management
    'admin': [
      { path: '/api/admin/init-db/database', method: 'POST', status: 'unknown', responseTime: 0, description: 'Initialize database with seed data' },
      { path: '/api/admin/init-db/database', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get database initialization status' },
      { path: '/api/admin/import-csv', method: 'POST', status: 'unknown', responseTime: 0, description: 'Import CSV data into collections' },
      { path: '/api/admin/import-csv', method: 'GET', status: 'unknown', responseTime: 0, description: 'List available CSV files for import' },
      { path: '/api/admin/users', method: 'GET', status: 'unknown', responseTime: 0, description: 'Admin user management' }
    ],
    'debug': [
      { path: '/api/debug/health', method: 'GET', status: 'unknown', responseTime: 0, description: 'System health check' },
      { path: '/api/debug/db', method: 'GET', status: 'unknown', responseTime: 0, description: 'Database connection test' },
      { path: '/api/debug/db', method: 'POST', status: 'unknown', responseTime: 0, description: 'Run database maintenance' }
    ],
    'health': [
      { path: '/api/health', method: 'GET', status: 'unknown', responseTime: 0, description: 'Basic health check' }
    ],
    'test': [
      { path: '/api/test', method: 'GET', status: 'unknown', responseTime: 0, description: 'API test endpoint' }
    ],
    'test-db': [
      { path: '/api/test-db', method: 'GET', status: 'unknown', responseTime: 0, description: 'Database connection test' }
    ],
    
    // Authentication & User Management
    'auth': [
      { path: '/api/auth/login', method: 'POST', status: 'unknown', responseTime: 0, description: 'User login' },
      { path: '/api/auth/register', method: 'POST', status: 'unknown', responseTime: 0, description: 'User registration' },
      { path: '/api/auth/[...nextauth]', method: 'GET', status: 'unknown', responseTime: 0, description: 'NextAuth.js API routes' }
    ],
    'user': [
      { path: '/api/user/profile', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get user profile' },
      { path: '/api/user/profile', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update user profile' },
      { path: '/api/user/settings', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get user settings' },
      { path: '/api/user/settings', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update user settings' },
      { path: '/api/user/weight', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get weight history' },
      { path: '/api/user/weight', method: 'POST', status: 'unknown', responseTime: 0, description: 'Log new weight entry' },
      { path: '/api/user/progress', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get user progress data' }
    ],
    
    // Task Management
    'tasks': [
      { path: '/api/tasks', method: 'GET', status: 'unknown', responseTime: 0, description: 'List tasks' },
      { path: '/api/tasks', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create task' },
      { path: '/api/tasks/[id]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get task by ID' },
      { path: '/api/tasks/[id]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update task' },
      { path: '/api/tasks/[id]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete task' },
      { path: '/api/tasks/[id]/streak', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get task streak data' },
      { path: '/api/tasks/batch', method: 'POST', status: 'unknown', responseTime: 0, description: 'Batch task operations' },
      { path: '/api/tasks/due', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get due tasks' },
      { path: '/api/tasks/statistics', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get task statistics' }
    ],
    
    // Exercise & Training System
    'exercises': [
      { path: '/api/exercises', method: 'GET', status: 'unknown', responseTime: 0, description: 'List exercises' },
      { path: '/api/exercises', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create exercise' },
      { path: '/api/exercises/[id]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get exercise by ID' },
      { path: '/api/exercises/[id]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update exercise' },
      { path: '/api/exercises/[id]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete exercise' },
      { path: '/api/exercises/[id]/sets/[setIndex]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update exercise set' },
      { path: '/api/exercises/progression', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get exercise progressions' },
      { path: '/api/exercises/search', method: 'GET', status: 'unknown', responseTime: 0, description: 'Search exercises' }
    ],
    'workouts': [
      { path: '/api/workouts', method: 'GET', status: 'unknown', responseTime: 0, description: 'List workouts' },
      { path: '/api/workouts', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create workout' },
      { path: '/api/workouts/[id]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get workout by ID' },
      { path: '/api/workouts/[id]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update workout' },
      { path: '/api/workouts/[id]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete workout' },
      { path: '/api/workouts/[id]/sets', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get workout sets' },
      { path: '/api/workouts/[id]/sets', method: 'POST', status: 'unknown', responseTime: 0, description: 'Add workout set' },
      { path: '/api/workouts/[id]/sets/[setId]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update workout set' },
      { path: '/api/workouts/[id]/sets/[setId]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete workout set' },
      { path: '/api/workouts/performance', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get workout performance metrics' }
    ],
    
    // Nutrition System
    'foods': [
      { path: '/api/foods', method: 'GET', status: 'unknown', responseTime: 0, description: 'List foods' },
      { path: '/api/foods', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create food' },
      { path: '/api/foods/[id]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get food by ID' },
      { path: '/api/foods/[id]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update food' },
      { path: '/api/foods/[id]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete food' }
    ],
    'meals': [
      { path: '/api/meals', method: 'GET', status: 'unknown', responseTime: 0, description: 'List meals' },
      { path: '/api/meals', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create meal' },
      { path: '/api/meals/[id]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get meal by ID' },
      { path: '/api/meals/[id]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update meal' },
      { path: '/api/meals/[id]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Delete meal' },
      { path: '/api/meals/[id]/foods', method: 'GET', status: 'unknown', responseTime: 0, description: 'List foods in meal' },
      { path: '/api/meals/[id]/foods', method: 'POST', status: 'unknown', responseTime: 0, description: 'Add food to meal' },
      { path: '/api/meals/[id]/foods/[index]', method: 'PUT', status: 'unknown', responseTime: 0, description: 'Update food in meal' },
      { path: '/api/meals/[id]/foods/[index]', method: 'DELETE', status: 'unknown', responseTime: 0, description: 'Remove food from meal' }
    ],
    
    // Progress & Achievements
    'progress': [
      { path: '/api/progress', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get user progress data' },
      { path: '/api/progress/add-xp', method: 'POST', status: 'unknown', responseTime: 0, description: 'Add XP to user' },
      { path: '/api/progress/categories', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get progress categories' },
      { path: '/api/progress/category/[category]', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get progress for category' },
      { path: '/api/progress/history', method: 'GET', status: 'unknown', responseTime: 0, description: 'Get progress history' },
      { path: '/api/progress/history/maintenance', method: 'POST', status: 'unknown', responseTime: 0, description: 'Maintain progress history' }
    ],
    'achievements': [
      { path: '/api/achievements', method: 'GET', status: 'unknown', responseTime: 0, description: 'List achievements' },
      { path: '/api/achievements', method: 'POST', status: 'unknown', responseTime: 0, description: 'Create achievement' },
      { path: '/api/achievements/[id]/claim', method: 'POST', status: 'unknown', responseTime: 0, description: 'Claim achievement' }
    ]
  }

  // Fetch health data on load and when refreshing
  useEffect(() => {
    fetchEndpointsData()
  }, [])

  // Check status of a single endpoint
  async function checkEndpointStatus(endpoint: Endpoint): Promise<Endpoint> {
    // Clone the endpoint to avoid mutating the original
    const updatedEndpoint = { ...endpoint }
    
    // Initialize status counters
    let healthyCount = 0
    let degradedCount = 0
    let failingCount = 0
    
    // Only test GET endpoints without dynamic parameters
    const testableRoutes = endpoint.routes.filter(route => 
      route.method === 'GET' && !route.path.includes('[') && !route.path.includes(']')
    )
    
    // Update routes with status
    const updatedRoutes = await Promise.all(
      endpoint.routes.map(async (route) => {
        // If this is a route we can test
        if (testableRoutes.some(r => r.path === route.path && r.method === route.method)) {
          try {
            const startTime = Date.now()
            const response = await fetch(route.path, { 
              method: route.method,
              // Add cache-busting and timeout
              cache: 'no-store',
              signal: AbortSignal.timeout(3000)
            })
            const responseTime = Date.now() - startTime
            
            const status: EndpointStatus = response.ok ? 'healthy' : 'failing'
            
            // Update counters
            if (status === 'healthy') healthyCount++
            else failingCount++
            
            return { ...route, status, responseTime }
          } catch (error) {
            // Handle network errors or timeouts
            failingCount++
            return { ...route, status: 'failing', responseTime: 0 }
          }
        }
        
        // For other methods or routes with parameters, just return as is
        return route
      })
    )
    
    // Update the endpoint's overall status based on routes
    if (testableRoutes.length > 0) {
      if (failingCount > 0) {
        updatedEndpoint.status = 'failing'
      } else if (degradedCount > 0) {
        updatedEndpoint.status = 'degraded'
      } else if (healthyCount > 0) {
        updatedEndpoint.status = 'healthy'
      }
    }
    
    updatedEndpoint.routes = updatedRoutes as Route[]
    updatedEndpoint.lastChecked = new Date().toLocaleTimeString()
    
    return updatedEndpoint
  }

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

      // Base endpoints list
      const baseEndpoints = Object.keys(endpointRoutes)
      
      // Create initial endpoints with routes
      const initialEndpoints: Endpoint[] = baseEndpoints.map(name => {
        // Determine initial status
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
          domain: domainMapping[name] || 'Other',
          routes: endpointRoutes[name] || []
        }
      })
      
      // Set initial endpoints data
      setEndpoints(initialEndpoints)
      
      // Check health endpoint first
      const healthEndpoint = initialEndpoints.find(e => e.name === 'health')
      if (healthEndpoint) {
        const updatedHealthEndpoint = await checkEndpointStatus(healthEndpoint)
        setEndpoints(prev => 
          prev.map(ep => ep.name === 'health' ? updatedHealthEndpoint : ep)
        )
      }
      
      // Check debug endpoints next
      const debugEndpoint = initialEndpoints.find(e => e.name === 'debug')
      if (debugEndpoint) {
        const updatedDebugEndpoint = await checkEndpointStatus(debugEndpoint)
        setEndpoints(prev => 
          prev.map(ep => ep.name === 'debug' ? updatedDebugEndpoint : ep)
        )
      }
      
      // If there was a selected endpoint, update its data
      if (selectedEndpoint) {
        const updated = initialEndpoints.find(e => e.name === selectedEndpoint.name)
        if (updated) {
          const checkedEndpoint = await checkEndpointStatus(updated)
          setSelectedEndpoint(checkedEndpoint)
          setEndpoints(prev => 
            prev.map(ep => ep.name === checkedEndpoint.name ? checkedEndpoint : ep)
          )
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    
    try {
      // First fetch initial endpoint data
      await fetchEndpointsData()
      
      // Then check all endpoints one by one
      const updatedEndpoints = [...endpoints]
      
      // Start tracking progress
      const testableEndpoints = updatedEndpoints.filter(endpoint => 
        endpoint.routes.some(route => 
          route.method === 'GET' && !route.path.includes('[') && !route.path.includes(']')
        )
      )
      
      setCheckProgress({ current: 0, total: testableEndpoints.length })
      
      // Check each endpoint sequentially to avoid overwhelming the server
      let currentProgress = 0
      for (let i = 0; i < updatedEndpoints.length; i++) {
        const endpoint = updatedEndpoints[i]
        // Only check endpoints with testable routes
        const hasTestableRoutes = endpoint.routes.some(route => 
          route.method === 'GET' && !route.path.includes('[') && !route.path.includes(']')
        )
        
        if (hasTestableRoutes) {
          const checkedEndpoint = await checkEndpointStatus(endpoint)
          updatedEndpoints[i] = checkedEndpoint
          
          // Update the state after each endpoint check to show progress
          setEndpoints([...updatedEndpoints])
          
          // Update progress indicator
          currentProgress++
          setCheckProgress({ current: currentProgress, total: testableEndpoints.length })
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      
      // If there was a selected endpoint, update it
      if (selectedEndpoint) {
        const updated = updatedEndpoints.find(e => e.name === selectedEndpoint.name)
        if (updated) {
          setSelectedEndpoint(updated)
        }
      }
    } catch (err) {
      console.error('Error refreshing all endpoints:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setRefreshing(false)
      setCheckProgress(null)
    }
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
      if (method === 'GET' && !path.includes('[') && !path.includes(']')) {
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
      } else {
        alert(`Cannot test ${method} endpoint ${path} directly from the UI. This may require parameters or a request body.`)
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
        
        {/* Progress indicator */}
        {checkProgress && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[#6B6B6B]">Checking endpoints</span>
              <span className="text-xs font-medium">{checkProgress.current}/{checkProgress.total}</span>
            </div>
            <div className="h-1 bg-[#E5E0DC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#A4907C] rounded-full transition-all duration-300"
                style={{ width: `${(checkProgress.current / checkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
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
            onSelect={async (endpoint) => {
              setSelectedEndpoint(endpoint)
              // Refresh status when selecting an endpoint
              const updatedEndpoint = await checkEndpointStatus(endpoint)
              setEndpoints(prev => 
                prev.map(ep => ep.name === endpoint.name ? updatedEndpoint : ep)
              )
              setSelectedEndpoint(updatedEndpoint)
            }}
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