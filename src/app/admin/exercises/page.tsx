'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Define proper types for the exercises
interface Exercise {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  progressionLevel?: number;
  description?: string;
}

export default function ExercisesAdminPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [debug, setDebug] = useState<any>(null)

  useEffect(() => {
    async function fetchExercises() {
      try {
        const response = await fetch('/api/exercises')
        
        // Log the response status
        console.log('API Response status:', response.status)
        
        // Try to parse the response to JSON
        const data = await response.json()
        
        // Store the raw data for debugging
        setDebug(data)
        
        console.log('API Response data:', data)
        
        if (data.success === true && Array.isArray(data.data)) {
          setExercises(data.data)
          setError(null)
        } else {
          console.error('Invalid data format:', data)
          setError(`API returned unexpected format. Check console for details.`)
          setExercises([])
        }
      } catch (err) {
        console.error('Error fetching exercises:', err)
        setError('Error fetching exercises: ' + ((err as Error)?.message || String(err)))
        setExercises([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchExercises()
  }, [])

  // Ensure we have an array before using reduce
  const exercisesToDisplay = Array.isArray(exercises) ? exercises : [];

  // Group exercises by category
  const exercisesByCategory = exercisesToDisplay.reduce<Record<string, Exercise[]>>((acc, exercise) => {
    const category = exercise.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(exercise);
    return acc;
  }, {});

  // Group exercises by subcategory
  const exercisesBySubcategory = exercisesToDisplay.reduce<Record<string, Exercise[]>>((acc, exercise) => {
    const subcategory = exercise.subcategory || 'uncategorized';
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(exercise);
    return acc;
  }, {});

  // Get counts by progression level
  const countsByLevel = exercisesToDisplay.reduce<Record<number, number>>((acc, exercise) => {
    const level = exercise.progressionLevel || 0;
    if (!acc[level]) {
      acc[level] = 0;
    }
    acc[level]++;
    return acc;
  }, {});

  // Filter exercises based on selected filter
  const filteredExercises = filter === 'all' 
    ? exercisesToDisplay 
    : exercisesToDisplay.filter(ex => ex.category === filter);

  if (loading) {
    return <div className="p-8">Loading exercises data...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exercise Data</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
          <h3 className="font-bold mb-2">Error:</h3>
          <p>{error}</p>
          
          {debug && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">Show debug info</summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          )}
          
          <div className="mt-4">
            <p className="text-sm font-medium">Try importing exercise data:</p>
            <button 
              onClick={() => fetch('/api/admin/import-exercises', { method: 'POST' }).then(r => r.json()).then(() => window.location.reload())}
              className="mt-2 px-4 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
            >
              Import Exercises
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Category counts card */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(exercisesByCategory).map(([category, items]) => (
                <div key={category} className="flex justify-between">
                  <span className="capitalize">{category}:</span>
                  <span className="font-bold">{items.length}</span>
                </div>
              ))}
              <div className="mt-4 pt-2 border-t">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{exercisesToDisplay.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

                {/* Subcategory counts card */}
        <Card>
          <CardHeader>
            <CardTitle>Subcategories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(exercisesBySubcategory).map(([subcategory, items]) => (
                <div key={subcategory} className="flex justify-between">
                  <span className="capitalize">{subcategory || 'none'}:</span>
                  <span className="font-bold">{items.length}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progression levels card */}
        <Card>
          <CardHeader>
            <CardTitle>Progression Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(countsByLevel)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([level, count]) => (
                  <div key={level} className="flex justify-between">
                    <span>Level {level}:</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Exercise stats card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Total Exercises:</span>{' '}
                <span className="font-bold text-lg">{exercisesToDisplay.length}</span>
              </div>
              <div>
                <span className="font-medium">Categories:</span>{' '}
                <span className="font-bold">{Object.keys(exercisesByCategory).length}</span>
              </div>
              <div>
                <span className="font-medium">Subcategories:</span>{' '}
                <span className="font-bold">{Object.keys(exercisesBySubcategory).length}</span>
              </div>
              <div>
                <span className="font-medium">Max Level:</span>{' '}
                <span className="font-bold">
                  {Math.max(...exercisesToDisplay.map(ex => ex.progressionLevel || 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exercise filter */}
      <div className="mb-6">
        <label className="mr-2">Filter by category:</label>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded p-2"
        >
          <option value="all">All Categories</option>
          {Object.keys(exercisesByCategory).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Exercise list */}
      <Card>
        <CardHeader>
          <CardTitle>Exercise List ({filteredExercises.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Subcategory</th>
                  <th className="border p-2 text-left">Level</th>
                  <th className="border p-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredExercises.slice(0, 20).map((exercise) => (
                  <tr key={exercise._id} className="border-b">
                    <td className="border p-2">{exercise.name}</td>
                    <td className="border p-2">{exercise.category}</td>
                    <td className="border p-2">{exercise.subcategory || '-'}</td>
                    <td className="border p-2">{exercise.progressionLevel}</td>
                    <td className="border p-2 max-w-xs truncate">{exercise.description || '-'}</td>
                  </tr>
                ))}
                {filteredExercises.length > 20 && (
                  <tr>
                    <td colSpan={5} className="p-2 text-center text-gray-500">
                      ... and {filteredExercises.length - 20} more exercises
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}