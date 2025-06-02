#!/usr/bin/env node
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3000'
const DELAY = 500 // milliseconds between requests

interface TestCase {
  name: string
  path: string
  description: string
}

const testCases: TestCase[] = [
  // Public pages
  { name: 'Login Page', path: '/auth/login', description: 'Authentication page' },
  
  // Admin pages
  { name: 'Admin Dashboard', path: '/admin/dashboard', description: 'Admin overview with metrics' },
  { name: 'Inventory Ledger', path: '/warehouse/inventory', description: 'Transaction ledger and balances' },
  { name: 'Run Calculations', path: '/admin/calculations', description: 'Manual calculation triggers' },
  { name: 'Finance Dashboard', path: '/finance/dashboard', description: 'Financial overview with charts' },
  { name: 'Invoices', path: '/finance/invoices', description: 'Invoice management' },
  { name: 'Invoice Creation', path: '/finance/invoices/new', description: 'Create new invoice' },
  { name: 'Reconciliation', path: '/finance/reconciliation', description: 'Invoice reconciliation' },
  { name: 'Reports', path: '/admin/reports', description: 'Report generation' },
  { name: 'SKU Master', path: '/admin/settings/skus', description: 'SKU management' },
  { name: 'New SKU', path: '/admin/settings/skus/new', description: 'Create new SKU' },
  { name: 'Warehouse Configs', path: '/admin/settings/warehouse-configs', description: 'Warehouse configurations' },
  { name: 'New Config', path: '/admin/settings/warehouse-configs/new', description: 'Create warehouse config' },
  { name: 'Cost Rates', path: '/admin/settings/rates', description: 'Cost rate management' },
  { name: 'New Rate', path: '/admin/settings/rates/new', description: 'Create cost rate' },
  { name: 'Users', path: '/admin/users', description: 'User management' },
  { name: 'Amazon Integration', path: '/admin/amazon', description: 'Amazon inventory comparison' },
  { name: 'Settings', path: '/admin/settings', description: 'System settings' },
  { name: 'Database Settings', path: '/admin/settings/database', description: 'Database optimization' },
  { name: 'Warehouse Settings', path: '/admin/settings/warehouses', description: 'Warehouse management' },
  
  // Staff pages
  { name: 'Warehouse Dashboard', path: '/warehouse/dashboard', description: 'Warehouse overview' },
  { name: 'Warehouse Reports', path: '/warehouse/reports', description: 'Operational reports' },
  { name: 'Warehouse Settings', path: '/warehouse/settings', description: 'Warehouse preferences' },
]

const apiEndpoints = [
  { name: 'Health Check', path: '/api/health', method: 'GET' },
  { name: 'SKUs API', path: '/api/skus', method: 'GET' },
  { name: 'Simple SKUs API', path: '/api/skus-simple', method: 'GET' },
  { name: 'Warehouses API', path: '/api/warehouses', method: 'GET' },
  { name: 'Rates API', path: '/api/rates', method: 'GET' },
  { name: 'Invoices API', path: '/api/invoices', method: 'GET' },
  { name: 'Transactions API', path: '/api/transactions', method: 'GET' },
  { name: 'Reports API', path: '/api/reports', method: 'GET' },
  { name: 'Calculations API', path: '/api/calculations', method: 'GET' },
  { name: 'Amazon Comparison', path: '/api/amazon/inventory-comparison', method: 'GET' },
  { name: 'Admin Dashboard API', path: '/api/admin/dashboard', method: 'GET' },
  { name: 'Finance Dashboard API', path: '/api/finance/dashboard', method: 'GET' },
]

async function testPage(testCase: TestCase): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}${testCase.path}`)
    const success = response.status === 200 || response.status === 307 // 307 for redirects
    
    return { success }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function testAPI(endpoint: any): Promise<{ success: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    // 401 is expected for protected endpoints without auth
    const success = response.status === 200 || response.status === 401
    return { success, status: response.status }
  } catch (error) {
    return { success: false, status: 0, error: error.message }
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runTests() {
  console.log('🧪 Warehouse Management System - Feature Test')
  console.log('=' .repeat(60))
  console.log(`Testing URL: ${BASE_URL}`)
  console.log(`Date: ${new Date().toLocaleString()}`)
  console.log('\n')

  // Test pages
  console.log('📄 Testing Pages:')
  console.log('-' .repeat(60))
  
  let pagesPassed = 0
  let pagesFailed = 0
  
  for (const testCase of testCases) {
    const result = await testPage(testCase)
    const status = result.success ? '✅' : '❌'
    const error = result.error ? ` - ${result.error}` : ''
    
    console.log(`${status} ${testCase.name.padEnd(25)} ${testCase.path}${error}`)
    
    if (result.success) pagesPassed++
    else pagesFailed++
    
    await sleep(DELAY)
  }
  
  console.log('\n')
  
  // Test APIs
  console.log('🔌 Testing API Endpoints:')
  console.log('-' .repeat(60))
  
  let apisPassed = 0
  let apisFailed = 0
  
  for (const endpoint of apiEndpoints) {
    const result = await testAPI(endpoint)
    const status = result.success ? '✅' : '❌'
    const statusCode = result.status ? ` (${result.status})` : ''
    const error = result.error ? ` - ${result.error}` : ''
    
    console.log(`${status} ${endpoint.name.padEnd(25)} ${endpoint.method} ${endpoint.path}${statusCode}${error}`)
    
    if (result.success) apisPassed++
    else apisFailed++
    
    await sleep(DELAY)
  }
  
  console.log('\n')
  
  // Summary
  console.log('📊 Test Summary:')
  console.log('=' .repeat(60))
  console.log(`Pages:     ${pagesPassed} passed, ${pagesFailed} failed`)
  console.log(`APIs:      ${apisPassed} passed, ${apisFailed} failed`)
  console.log(`Total:     ${pagesPassed + apisPassed} passed, ${pagesFailed + apisFailed} failed`)
  console.log(`Success:   ${(((pagesPassed + apisPassed) / (testCases.length + apiEndpoints.length)) * 100).toFixed(1)}%`)
  
  console.log('\n')
  console.log('📝 Notes:')
  console.log('- Pages returning 307 (redirect) are considered successful')
  console.log('- APIs returning 401 (unauthorized) are considered successful')
  console.log('- This test checks accessibility, not functionality')
  console.log('- For full functionality testing, use manual test checklist')
}

runTests().catch(console.error)