import { config } from 'dotenv'
import fetch from 'node-fetch'

config()

async function testFinanceDashboard() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  console.log('Testing Finance Dashboard API...')
  console.log('Base URL:', baseUrl)
  
  try {
    // Test the finance dashboard API endpoint
    console.log('\n1. Testing /api/finance/dashboard endpoint...')
    const response = await fetch(`${baseUrl}/api/finance/dashboard`, {
      headers: {
        'Cookie': 'next-auth.session-token=test-session' // This won't work without a real session
      }
    })
    
    console.log('Status:', response.status)
    console.log('Headers:', response.headers.raw())
    
    const text = await response.text()
    console.log('Response:', text)
    
    if (response.ok) {
      try {
        const data = JSON.parse(text)
        console.log('\nParsed data structure:')
        console.log('- KPIs:', Object.keys(data.kpis || {}))
        console.log('- Cost breakdown items:', data.costBreakdown?.length || 0)
        console.log('- Recent activity items:', data.recentActivity?.length || 0)
        console.log('- Invoice status:', Object.keys(data.invoiceStatus || {}))
      } catch (e) {
        console.error('Failed to parse JSON:', e)
      }
    }
    
  } catch (error) {
    console.error('Error testing finance dashboard:', error)
  }
}

// Run the test
testFinanceDashboard()