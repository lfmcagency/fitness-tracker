'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Database, Dumbbell, Activity, Award, LineChart, Home, LogOut } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const isAdmin = session?.user?.role === 'admin'

  const mainLinks = [
    { href: '/dashboard', label: 'Dashboard', requireAuth: true },
    { href: '/training', label: 'Training', requireAuth: true },
    { href: '/nutrition', label: 'Nutrition', requireAuth: true },
    { href: '/routine', label: 'Routine', requireAuth: true },
  ]

  const featureLinks = [
    { href: '/skill-tree', label: 'Skill Tree', icon: <LineChart className="h-4 w-4 mr-1" />, requireAuth: true },
    { href: '/profile', label: 'Profile', icon: <Award className="h-4 w-4 mr-1" />, requireAuth: true },
  ]

  const adminLinks = [
    { href: '/admin/database', label: 'Database', icon: <Database className="h-4 w-4 mr-1" />, requireAdmin: true },
    { href: '/admin/exercises', label: 'Exercises', icon: <Dumbbell className="h-4 w-4 mr-1" />, requireAdmin: true },
  ]

  // Filter links based on authentication status
  const visibleMainLinks = mainLinks.filter(link => !link.requireAuth || isAuthenticated)
  const visibleFeatureLinks = featureLinks.filter(link => !link.requireAuth || isAuthenticated)
  const visibleAdminLinks = adminLinks.filter(link => !link.requireAdmin || isAdmin)

  return (
    <>
      <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
        {!isAuthenticated && (
          <Link
            href="/"
            className={`${
              pathname === '/' 
                ? 'border-blue-500 text-gray-900' 
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Link>
        )}

        {visibleMainLinks.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`${
                isActive
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              {label}
            </Link>
          )
        })}
      </div>
      
      <div className="hidden sm:ml-auto sm:flex sm:items-center">
        {visibleFeatureLinks.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } flex items-center px-3 py-1 text-sm font-medium rounded-md mr-2`}
            >
              {icon}
              {label}
            </Link>
          )
        })}

        {visibleAdminLinks.map(({ href, label, icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } flex items-center px-3 py-1 text-sm font-medium rounded-md mr-2`}
            >
              {icon}
              {label}
            </Link>
          )
        })}
        
        {isAuthenticated && (
          <Link
            href="/api/auth/signout"
            className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center px-3 py-1 text-sm font-medium rounded-md mr-2"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </Link>
        )}
      </div>
    </>
  )
}