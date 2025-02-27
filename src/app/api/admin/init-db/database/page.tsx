'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DatabaseAdminPage() {
  const [dbInfo, setDbInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Get database info
        const dbResponse = await fetch('/api/debug/db')
        const dbData = await dbResponse.json()
        setDbInfo(dbData)
        setLoading(false)
        
        // Get exercises
        const exercisesResponse = await fetch('/api/exercises')
        const exercisesData = await exercisesResponse.json()
        setExercises(exercisesData.data || [])
        setExercisesLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to fetch data: ' + (err instanceof Error ? err.message : String(err)))
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) {
    return <div className="p-8">Loading database information...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Admin</h1>
      
      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Connection:</span>{' '}
                <span className={dbInfo?.database?.connected ? "text-green-600" : "text-red-600"}>
                  {dbInfo?.database?.state || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="font-medium">Host:</span>{' '}
                <span>{dbInfo?.database?.host || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Database:</span>{' '}
                <span>{dbInfo?.database?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Environment:</span>{' '}
                <span>{dbInfo?.environment || 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(dbInfo?.database?.collections || {}).length === 0 ? (
              <p>No collections found</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dbInfo?.database?.collections || {}).map(([model, count]) => (
                  <div key={model}>
                    <span className="font-medium">{model}:</span>{' '}
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Exercises ({exercisesLoading ? 'Loading...' : exercises.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {exercisesLoading ? (
              <p>Loading exercises...</p>
            ) : exercises.length === 0 ? (
              <p>No exercises found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Name</th>
                      <th className="border p-2 text-left">Category</th>
                      <th className="border p-2 text-left">Level</th>
                      <th className="border p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercises.slice(0, 10).map((exercise) => (
                      <tr key={exercise._id} className="border-b">
                        <td className="border p-2">{exercise.name}</td>
                        <td className="border p-2">{exercise.category}</td>
                        <td className="border p-2">{exercise.progressionLevel}</td>
                        <td className="border p-2">{exercise.description || '-'}</td>
                      </tr>
                    ))}
                    {exercises.length > 10 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-gray-500">
                          ... and {exercises.length - 10} more exercises
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}