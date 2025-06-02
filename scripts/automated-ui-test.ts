import fetch from 'node-fetch'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  status: 'pass' | 'fail'
  error?: string
  time?: number
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, status: 'pass', time: Date.now() - start })
    console.log(`✅ ${name}`)
  } catch (error) {
    results.push({ name, status: 'fail', error: error.message, time: Date.now() - start })
    console.log(`❌ ${name}: ${error.message}`)
  }
}

async function testEndpoint(name: string, path: string, expectedStatus = 200) {
  await test(name, async () => {
    const response = await fetch(`${BASE_URL}${path}`)
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
    }
  })
}

async function testAPI(name: string, path: string, options?: any) {
  await test(name, async () => {
    const response = await fetch(`${BASE_URL}/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    })
    
    if (!response.ok && response.status !== 401) {
      const text = await response.text()
      throw new Error(`API error: ${response.status} - ${text}`)
    }
  })
}

async function runTests() {
  console.log('🧪 Running Automated UI Tests...\n')
  
  // Test public pages
  console.log('📄 Testing Public Pages:')
  await testEndpoint('Login page', '/auth/login')
  await testEndpoint('Root redirects to login', '/', 200)
  
  // Test API health
  console.log('\n🔌 Testing API Endpoints:')
  await testAPI('Health check', '/health')
  
  // Test protected endpoints (should return 401)
  await test('Protected endpoints require auth', async () => {
    const response = await fetch(`${BASE_URL}/api/skus`)
    if (response.status !== 401) {
      throw new Error('Protected endpoint accessible without auth')
    }
  })
  
  // Test database connectivity
  console.log('\n💾 Testing Database:')
  await test('Database connection', async () => {
    const count = await prisma.user.count()
    if (count === 0) throw new Error('No users in database')
  })
  
  await test('Admin user exists', async () => {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (!admin) throw new Error('No admin user found')
  })
  
  await test('Warehouses exist', async () => {
    const warehouses = await prisma.warehouse.count()
    if (warehouses === 0) throw new Error('No warehouses found')
  })
  
  await test('Amazon warehouse exists', async () => {
    const amazon = await prisma.warehouse.findFirst({ 
      where: { name: 'Amazon FBA UK' } 
    })
    if (!amazon) throw new Error('Amazon FBA UK warehouse not found')
  })
  
  // Test data integrity
  console.log('\n🔍 Testing Data Integrity:')
  await test('Transaction types are valid', async () => {
    const invalidTx = await prisma.inventoryTransaction.findFirst({
      where: {
        transactionType: {
          notIn: ['RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT']
        }
      }
    })
    if (invalidTx) throw new Error('Invalid transaction type found')
  })
  
  await test('Cost rate categories are valid', async () => {
    const invalidRate = await prisma.costRate.findFirst({
      where: {
        costCategory: {
          notIn: ['Storage', 'Container', 'Carton', 'Pallet', 'Unit', 'Shipment', 'Accessorial']
        }
      }
    })
    if (invalidRate) throw new Error('Invalid cost rate category found')
  })
  
  // Test calculations
  console.log('\n🧮 Testing Calculations:')
  await test('Inventory balances are non-negative', async () => {
    const skus = await prisma.sku.findMany({
      include: {
        inventoryTransactions: true
      }
    })
    
    for (const sku of skus) {
      const balance = sku.inventoryTransactions.reduce((sum, tx) => {
        if (tx.transactionType === 'RECEIVE' || tx.transactionType === 'ADJUST_IN') {
          return sum + (tx.cartonsIn || 0)
        } else {
          return sum - (tx.cartonsOut || 0)
        }
      }, 0)
      
      if (balance < 0) {
        throw new Error(`SKU ${sku.code} has negative balance: ${balance}`)
      }
    }
  })
  
  // Print summary
  console.log('\n📊 Test Summary:')
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const totalTime = results.reduce((sum, r) => sum + (r.time || 0), 0)
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏱️  Total time: ${totalTime}ms`)
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }
  
  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)