'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Breadcrumb as AntBreadcrumb } from 'antd'
import { HomeOutlined } from '@ant-design/icons'

export function Breadcrumb() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Don't show breadcrumbs on home or login pages
  if (pathname === '/' || pathname === '/auth/login') {
    return null
  }

  // Parse the pathname into segments
  const segments = pathname.split('/').filter(Boolean)
  
  // Handle special cases for better labels
  const formatLabel = (segment: string) => {
    switch (segment) {
      case 'operations':
        return 'Operations'
      case 'finance':
        return 'Finance'
      case 'config':
        return 'Configuration'
      case 'admin':
        return 'Admin'
      case 'integrations':
        return 'Integrations'
      case 'transactions':
        return 'Transactions'
      case 'inventory':
        return 'Inventory Ledger'
      default:
        // For IDs and other segments, format them nicely
        if (segment.match(/^[a-f0-9-]+$/i) && segment.length > 20) {
          // Looks like an ID, truncate it
          return segment.substring(0, 8) + '...'
        } else {
          return segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
    }
  }

  // Determine home link based on user role
  const homeLink = session?.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'

  // Create breadcrumb items
  const items = [
    {
      title: (
        <Link href={homeLink} className="flex items-center">
          <HomeOutlined />
        </Link>
      ),
    },
    ...segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const label = formatLabel(segment)
      const isLast = index === segments.length - 1
      
      return {
        title: isLast ? (
          <span className="font-medium">{label}</span>
        ) : (
          <Link href={href}>{label}</Link>
        ),
      }
    }),
  ]

  return (
    <AntBreadcrumb 
      items={items}
      className="mb-4 text-sm"
    />
  )
}