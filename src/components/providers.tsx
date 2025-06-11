'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { ErrorBoundary } from './error-boundary'
import { ConfigProvider, App, theme as antdTheme } from 'antd'
import { theme, darkTheme } from '@/lib/antd-theme'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  useEffect(() => {
    // Check if dark mode is enabled
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const htmlElement = document.documentElement
    
    const checkDarkMode = () => {
      const isDark = htmlElement.classList.contains('dark') || darkModeMediaQuery.matches
      setIsDarkMode(isDark)
    }
    
    checkDarkMode()
    
    // Listen for changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(htmlElement, { attributes: true, attributeFilter: ['class'] })
    darkModeMediaQuery.addEventListener('change', checkDarkMode)
    
    return () => {
      observer.disconnect()
      darkModeMediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])
  
  const currentTheme = isDarkMode ? {
    ...darkTheme,
    algorithm: antdTheme.darkAlgorithm,
  } : theme

  return (
    <ErrorBoundary>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={currentTheme}>
            <App>
              {children}
            </App>
          </ConfigProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}