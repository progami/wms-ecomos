'use client'

import { useEffect, useCallback } from 'react'
import { clientLogger } from '@/lib/logger/client'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useClientLogger() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Log page views
  useEffect(() => {
    if (clientLogger) {
      clientLogger.navigation('page_view', pathname, {
        userId: session?.user?.id,
        userRole: session?.user?.role,
        timestamp: new Date().toISOString()
      })
    }
  }, [pathname, session])

  // Log user actions
  const logAction = useCallback((action: string, metadata?: any) => {
    if (clientLogger) {
      clientLogger.action(action, {
        ...metadata,
        userId: session?.user?.id,
        userRole: session?.user?.role,
        page: pathname,
        timestamp: new Date().toISOString()
      })
    }
  }, [pathname, session])

  // Log performance metrics
  const logPerformance = useCallback((metric: string, value: number, metadata?: any) => {
    if (clientLogger) {
      clientLogger.performance(metric, value, {
        ...metadata,
        userId: session?.user?.id,
        page: pathname
      })
    }
  }, [pathname, session])

  // Log errors
  const logError = useCallback((message: string, error: any) => {
    if (clientLogger) {
      clientLogger.error(message, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        userId: session?.user?.id,
        page: pathname
      })
    }
  }, [pathname, session])

  return {
    logAction,
    logPerformance,
    logError
  }
}