'use client'

import { useState, useEffect } from 'react'

export default function SimpleAdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Test with both the simple API and test API
    Promise.all([
      fetch('/api/admin/dashboard-simple').then(r => ({ route: 'dashboard-simple', response: r })),
      fetch('/api/test-dashboard').then(r => ({ route: 'test-dashboard', response: r }))
    ]).then(async (results) => {
      const responses = await Promise.all(
        results.map(async ({ route, response }) => {
          if (response.ok) {
            const data = await response.json()
            return { route, success: true, data }
          } else {
            const text = await response.text()
            return { route, success: false, error: `${response.status}: ${text}` }
          }
        })
      )
      
      setData(responses)
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Simple Admin Dashboard Test</h1>
      
      {loading && (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading API routes...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {data && (
        <div className="space-y-6">
          {data.map((result: any) => (
            <div key={result.route} className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">
                API Route: /api/{result.route}
              </h2>
              {result.success ? (
                <div>
                  <div className="bg-green-100 text-green-700 px-3 py-2 rounded mb-2">
                    ✓ Success
                  </div>
                  <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded">
                  ✗ Failed: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <ul className="text-sm space-y-1">
          <li>• This page bypasses authentication for testing</li>
          <li>• Tests two API routes: /api/admin/dashboard-simple and /api/test-dashboard</li>
          <li>• Check browser console for additional logs</li>
          <li>• Current URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</li>
        </ul>
      </div>
    </div>
  )
}