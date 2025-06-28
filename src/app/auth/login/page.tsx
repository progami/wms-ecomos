'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Package2, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  })
  
  // Prevent autofill on mount
  useEffect(() => {
    // Clear any autofilled values and set readonly initially
    const timer = setTimeout(() => {
      const emailInput = document.getElementById('emailOrUsername') as HTMLInputElement
      const passwordInput = document.getElementById('password') as HTMLInputElement
      
      if (emailInput && passwordInput) {
        // Force clear autofilled values
        if (emailInput.value && !formData.emailOrUsername) {
          emailInput.value = ''
        }
        if (passwordInput.value && !formData.password) {
          passwordInput.value = ''
        }
        
        // Remove readonly attribute after a delay
        setTimeout(() => {
          emailInput.removeAttribute('readonly')
          passwordInput.removeAttribute('readonly')
        }, 500)
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Removed auto-fill on mount to allow buttons to work properly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email/username or password')
      } else {
        toast.success('Login successful!')
        // If there's a callback URL, use it. Otherwise, let middleware handle the redirect
        if (callbackUrl) {
          router.push(callbackUrl)
        } else {
          // Redirect to home and let middleware handle role-based routing
          router.push('/')
        }
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryDemo = async () => {
    setIsDemoLoading(true)
    
    try {
      // First, check if demo data already exists
      const statusResponse = await fetch('/api/demo/status')
      const statusData = await statusResponse.json()
      
      if (!statusData.isDemoMode) {
        // Set up demo environment only if not already set up
        toast.loading('Setting up demo environment...', { id: 'demo-setup' })
        
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf-token='))
          ?.split('=')[1];
        
        const setupResponse = await fetch('/api/demo/setup', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(csrfToken && { 'x-csrf-token': csrfToken })
          },
        })

        if (!setupResponse.ok) {
          const errorData = await setupResponse.json()
          throw new Error(errorData.error || 'Failed to set up demo environment')
        }
        
        toast.success('Demo environment ready!', { id: 'demo-setup' })
      }

      // Auto-fill the form with demo credentials
      setFormData({
        emailOrUsername: 'demo-admin',
        password: 'SecureWarehouse2024!',
      })
      
      // Short delay to show the credentials being filled
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Automatically submit the form
      const result = await signIn('credentials', {
        emailOrUsername: 'demo-admin',
        password: 'SecureWarehouse2024!',
        redirect: false,
      })

      if (result?.error) {
        throw new Error('Failed to sign in to demo account')
      }

      toast.success('Welcome to WMS Demo! 🎉', {
        duration: 6000,
      })
      
      // Redirect to unified dashboard
      if (callbackUrl) {
        router.push(callbackUrl)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (error) {
      console.error('Error setting up demo:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to set up demo')
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Package2 className="h-10 w-10 text-primary" />
              <h1 className="text-2xl font-bold">WMS</h1>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Warehouse Management System
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} name="wms-login-form" autoComplete="off">
          {/* Hidden inputs to prevent autofill */}
          <input type="text" name="fake-username" style={{ display: 'none' }} />
          <input type="password" name="fake-password" style={{ display: 'none' }} />
          
          {/* Quick fill buttons */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Quick fill credentials:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ emailOrUsername: 'admin', password: 'SecureWarehouse2024!' })}
                className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setFormData({ emailOrUsername: 'hashar', password: 'StaffAccess2024!' })}
                className="text-xs py-1 px-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
              >
                Hashar (Finance)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ emailOrUsername: 'umair', password: 'StaffAccess2024!' })}
                className="text-xs py-1 px-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                Umair (Operations)
              </button>
            </div>
          </div>
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="emailOrUsername" className="sr-only">
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                name="wms-username"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Email or Username"
                value={formData.emailOrUsername}
                onChange={(e) =>
                  setFormData({ ...formData, emailOrUsername: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="wms-password"
                type="password"
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isDemoLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="loading-spinner" />
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              OR
            </span>
          </div>
        </div>

        {/* Try Demo Button */}
        <div className="mt-6">
          <button
            onClick={handleTryDemo}
            disabled={isDemoLoading || isLoading}
            className="group relative w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            {isDemoLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Setting up demo...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Try Demo</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          {/* Helper text */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Instant access with sample data</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Demo includes: inventory items, customers, movements, invoices, and analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}