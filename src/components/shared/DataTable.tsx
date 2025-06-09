"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, item: T) => React.ReactNode
  searchable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchPlaceholder?: string
  pagination?: {
    total: number
    page: number
    limit: number
    pages: number
  }
  onPageChange?: (page: number) => void
  emptyMessage?: string
  actions?: (item: T) => React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  pagination,
  onPageChange,
  emptyMessage = "No data found",
  actions
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = data.filter(item => {
    if (!searchTerm) return true
    
    return columns.some(column => {
      if (column.searchable === false) return false
      const value = item[column.key]
      return String(value).toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  const handlePageChange = (newPage: number) => {
    if (pagination && onPageChange && newPage >= 1 && newPage <= pagination.pages) {
      onPageChange(newPage)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-[#6B6B6B] mt-2">Loading...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-[#6B6B6B]">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F0EAE4]">
                  <tr>
                    {columns.map((column) => (
                      <th key={String(column.key)} className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">
                        {column.label}
                      </th>
                    ))}
                    {actions && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0DC]">
                  {filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-[#F7F3F0]">
                      {columns.map((column) => (
                        <td key={String(column.key)} className="px-4 py-3 text-sm">
                          {column.render 
                            ? column.render(item[column.key], item)
                            : String(item[column.key] || '')
                          }
                        </td>
                      ))}
                      {actions && (
                        <td className="px-4 py-3 text-sm">
                          {actions(item)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-[#E5E0DC] flex items-center justify-between">
                <span className="text-sm text-[#6B6B6B]">
                  Showing {filteredData.length} of {pagination.total} items
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}