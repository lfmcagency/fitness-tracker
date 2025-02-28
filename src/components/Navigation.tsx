'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database, Dumbbell, Activity, Award, LineChart } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/training', label: 'Training' },
    { href: '/nutrition', label: 'Nutrition' },
    { href: '/routine', label: 'Routine' },
  ]

  const newFeatures = [
    { href: '/skill-tree', label: 'Skill Tree', icon: <LineChart className="h-4 w-4 mr-1" /> },
    { href: '/profile', label: 'Profile', icon: <Award className="h-4 w-4 mr-1" /> },
    { href: '/training/enhanced', label: 'Enhanced Training', icon: <Activity className="h-4 w-4 mr-1" /> },
  ]

  const adminLinks = [
    { href: '/admin/database', label: 'Database', icon: <Database className="h-4 w-4 mr-1" /> },
    { href: '/admin/exercises', label: 'Exercises', icon: <Dumbbell className="h-4 w-4 mr-1" /> },
  ]

  return (
    <>
      <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
        {links.map(({ href, label }) => {
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
        {newFeatures.map(({ href, label, icon }) => {
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

        {adminLinks.map(({ href, label, icon }) => {
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
      </div>
    </>
  )
}