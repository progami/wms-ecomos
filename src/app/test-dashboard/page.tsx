'use client'

import { useState, useEffect } from 'react'

export default function TestDashboard() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Dashboard</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ color: 'red' }}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {data && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '10px' }}>
          <h2>API Response:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test Links:</h2>
        <ul>
          <li><a href="/api/health">Health Check API</a></li>
          <li><a href="/api/admin/dashboard-simple">Dashboard API</a></li>
          <li><a href="/admin/dashboard">Admin Dashboard</a></li>
          <li><a href="/finance/dashboard">Finance Dashboard</a></li>
          <li><a href="/admin/settings/skus">SKUs Page</a></li>
        </ul>
      </div>
    </div>
  )
}