'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignIn() {
  const router = useRouter()
  
  // Check URL parameters for email to pre-fill from registration
  const [email, setEmail] = useState(() => {
    // Check if we're on client side
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || 'test@example.com';
    }
    return 'test@example.com';
  })
  const [registered, setRegistered] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('registered') === 'true';
    }
    return false;
  })
  const [password, setPassword] = useState('') // Don't pre-fill password for security
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Set success message if user just registered
  useEffect(() => {
    if (registered) {
      setSuccess('Account created successfully! Please sign in with your credentials.');
    }
  }, [registered]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)
    
    try {
      console.log('Signing in with:', { email, password });
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })
      
      if (result?.error) {
        console.error('Sign-in error:', result.error);
        setError(`Authentication failed. Please check your email and password.`);
        setIsLoading(false);
        return;
      }
      
      if (result?.ok) {
        console.log('Sign-in successful, redirecting to dashboard');
        // Force a small delay to ensure the session is properly set
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
        return;
      }
      
      setError('Unknown error occurred during sign-in');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Something went wrong with the authentication system. Please try again.');
      setIsLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use test@example.com / password for development
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && (
            <div className="bg-green-50 p-3 rounded text-green-600 text-sm">{success}</div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 p-3 rounded text-red-600 text-sm">{error}</div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-600">
            <p>For development: test@example.com / password</p>
          </div>
        </form>
      </div>
    </div>
  )
}