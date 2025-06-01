'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function AuthDebugPage() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('admin@warehouse.com')
  const [password, setPassword] = useState('admin123')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('SignIn result:', result)

      if (result?.error) {
        toast.error(`Login failed: ${result.error}`)
      } else if (result?.ok) {
        toast.success('Login successful!')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Page</h1>
      
      <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Session Status</h2>
        <p>Status: <span className="font-mono">{status}</span></p>
        {session && (
          <div className="mt-2">
            <p>User: {session.user?.email}</p>
            <p>Name: {session.user?.name}</p>
            <p>Role: {session.user?.role}</p>
            <p>ID: {session.user?.id}</p>
          </div>
        )}
      </div>

      {!session ? (
        <form onSubmit={handleLogin} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900 rounded text-sm">
            <p className="font-semibold">Test Credentials:</p>
            <p>Admin: admin@warehouse.com / admin123</p>
            <p>Staff: staff@warehouse.com / staff123</p>
            <p>Finance: finance@warehouse.com / finance123</p>
          </div>
        </form>
      ) : (
        <div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="font-semibold mb-2">Debug Info</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({
            NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'Not set',
            session: session,
            status: status,
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
}