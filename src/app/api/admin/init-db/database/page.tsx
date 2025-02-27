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
    // Get database info
    fetch('/api/debug/db')
      .then(res => res.json())
      .then(data => {
        setDbInfo(data)
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to fetch database info: ' + err.message)
        setLoading(false)
      })

    // Get exercises
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        setExercises(data.data || [])
        setExercisesLoading(false)
      })
      .catch(err => {
        console.error('Error fetching exercises:', err)
        setExercisesLoading(false)
      })
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
              <div className="flex justify-between">
                <span className="font-medium">Connection:</span>
                <span className={dbInfo.database?.connected ? "text-green-600" : "text-red-600"}>
                  {dbInfo.database?.state || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Host:</span>
                <span>{dbInfo.database?.host || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Database:</span>
                <span>{dbInfo.database?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Environment:</span>
                <span>{dbInfo.environment || 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dbInfo.database?.collections && Object.entries(dbInfo.database.collections).map(([model, count]) => (
                <div key={model} className="flex justify-between">
                  <span className="font-medium">{model}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
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
              <div className="space-y-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exercises.slice(0, 10).map((exercise, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">{exercise.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{exercise.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{exercise.subcategory || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{exercise.progressionLevel || '-'}</td>
                      </tr>
                    ))}
                    {exercises.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          ... and {exercises.length - 10} more
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