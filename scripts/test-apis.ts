import fetch from 'node-fetch'

async function testAPIs() {
  const baseUrl = 'http://localhost:3000'
  
  // Test admin credentials
  const adminLogin = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@warehouse.com',
      password: 'password123',
      csrfToken: '', // This would normally come from the CSRF endpoint
    }),
  })
  
  console.log('Admin login status:', adminLogin.status)
  
  // Test API endpoints
  const endpoints = [
    '/api/admin/dashboard',
    '/api/finance/dashboard',
    '/api/skus',
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Cookie': adminLogin.headers.get('set-cookie') || '',
        },
      })
      
      const contentType = response.headers.get('content-type')
      let data = null
      
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }
      
      console.log(`\n${endpoint}:`)
      console.log('- Status:', response.status)
      console.log('- Data:', JSON.stringify(data, null, 2).substring(0, 200) + '...')
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error)
    }
  }
}

testAPIs()