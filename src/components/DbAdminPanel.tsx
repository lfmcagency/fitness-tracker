// src/components/DbAdminPanel.tsx (UPDATE)
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DbAdminPanel() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runAction = async (action: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch(`/api/admin/init-db?action=${action}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const importExercises = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/import-exercises', {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const importCsvExercises = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/import-csv', {
        method: 'POST'
      })
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Database Administration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => runAction('status')}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Check Status
          </button>
          
          <button
            onClick={() => runAction('init')}
            disabled={loading}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Initialize Indexes
          </button>
          
          <button
            onClick={() => runAction('seed')}
            disabled={loading}
            className="px-4 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200"
          >
            Seed Basic Data
          </button>
          
          <button
            onClick={importExercises}
            disabled={loading}
            className="px-4 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
          >
            Import Exercises
          </button>
          
          <button
            onClick={importCsvExercises}
            disabled={loading}
            className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200"
          >
            Import CSV Exercises
          </button>
          
          {isDevelopment && (
            <button
              onClick={() => runAction('clear')}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
            >
              Clear Database
            </button>
          )}
        </div>
        
        {loading && <div className="p-4 text-center">Loading...</div>}
        
        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="mt-4 border rounded p-4 bg-gray-50">
            <div className="font-bold mb-2">Result:</div>
            <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}