'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react'

export function DatabaseStatus() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    async function checkDbStatus() {
      try {
        const response = await fetch('/api/test-db')
        const data = await response.json()
        
        if (data.success && data.connection?.ready) {
          setStatus('connected')
          setMessage('Connected to MongoDB successfully')
        } else {
          setStatus('error')
          setMessage(data.message || 'Failed to connect to database')
        }
      } catch (error) {
        setStatus('error')
        setMessage('Failed to check database status')
      }
    }
    
    checkDbStatus()
  }, [])
  
  if (status === 'loading') {
    return (
      <Alert className="bg-gray-100 border-gray-200 mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Connecting to Database</AlertTitle>
        <AlertDescription>
          Please wait while we connect to the database...
        </AlertDescription>
      </Alert>
    )
  }
  
  if (status === 'error') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Database Connection Error</AlertTitle>
        <AlertDescription>
          {message}. The app will use mock data instead.
        </AlertDescription>
      </Alert>
    )
  }
  
  return (
    <Alert className="bg-green-50 border-green-200 mb-4">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <AlertTitle>Database Connected</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  )
}