'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/training', label: 'Training' },
    { href: '/nutrition', label: 'Nutrition' },
    { href: '/routine', label: 'Routine' },
  ]

  return (
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
  )
}
