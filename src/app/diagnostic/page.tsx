'use client'

import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'

export default function DiagnosticPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiTest, setApiTest] = useState<any>(null)

  const testLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email: 'admin@warehouse.com',
        password: 'admin123',
        redirect: false,
      })
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const testAPI = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint)
      const data = await response.json()
      setApiTest({ endpoint, status: response.status, data })
    } catch (err) {
      setApiTest({ endpoint, error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 System Diagnostic</h1>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>1. Authentication Status</h2>
        <p>Status: <strong>{status}</strong></p>
        {session && (
          <div>
            <p>User: {session.user.email}</p>
            <p>Role: {session.user.role}</p>
            <p>ID: {session.user.id}</p>
          </div>
        )}
        
        {!session && (
          <div>
            <button 
              onClick={testLogin} 
              disabled={loading}
              style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {loading ? 'Testing...' : 'Test Login (admin@warehouse.com)'}
            </button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>2. API Endpoints</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => testAPI('/api/health')}>Test Health</button>
          <button onClick={() => testAPI('/api/admin/dashboard-simple')}>Test Dashboard API</button>
          <button onClick={() => testAPI('/api/finance/dashboard-simple')}>Test Finance API</button>
          <button onClick={() => testAPI('/api/skus-simple')}>Test SKUs API</button>
        </div>
        
        {apiTest && (
          <pre style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', overflow: 'auto' }}>
            {JSON.stringify(apiTest, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>3. Quick Links</h2>
        <ul>
          <li><a href="/test-dashboard">Test Dashboard (No Auth)</a></li>
          <li><a href="/admin/dashboard">Admin Dashboard (Auth Required)</a></li>
          <li><a href="/finance/dashboard">Finance Dashboard (Auth Required)</a></li>
          <li><a href="/admin/settings/skus">SKUs Page (Auth Required)</a></li>
          <li><a href="/auth/login">Login Page</a></li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd' }}>
        <h2>4. Test Credentials</h2>
        <ul>
          <li><strong>Admin:</strong> admin@warehouse.com / admin123</li>
          <li><strong>Finance:</strong> finance@warehouse.com / admin123</li>
          <li><strong>Staff:</strong> staff@warehouse.com / admin123</li>
        </ul>
      </div>
    </div>
  )
}