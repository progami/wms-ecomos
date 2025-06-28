'use client'

import { useState } from 'react'

export default function TestClientPage() {
  const [count, setCount] = useState(0)
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Client Component Test</h1>
      <p>This is a client component with React hooks.</p>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Increment
      </button>
    </div>
  )
}