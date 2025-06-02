#!/usr/bin/env node
import { chromium, Browser, Page } from 'playwright'
import { config } from 'dotenv'

config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@warehouse.com'
const ADMIN_PASSWORD = 'admin123'
const STAFF_EMAIL = 'john.smith@warehouse.com'
const STAFF_PASSWORD = 'password123'

interface TestResult {
  section: string
  test: string
  status: 'pass' | 'fail'
  error?: string
  screenshot?: string
}

const results: TestResult[] = []

async function logResult(section: string, test: string, status: 'pass' | 'fail', error?: string) {
  const result: TestResult = { section, test, status, error }
  results.push(result)
  console.log(`${status === 'pass' ? '✅' : '❌'} ${section} - ${test}${error ? `: ${error}` : ''}`)
}

async function takeScreenshot(page: Page, name: string) {
  try {
    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  } catch (e) {
    console.log('Failed to take screenshot:', e)
  }
}

async function testLogin(page: Page, email: string, password: string, role: string) {
  try {
    await page.goto(`${BASE_URL}/auth/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    await logResult('Authentication', `${role} login`, 'pass')
    return true
  } catch (error) {
    await logResult('Authentication', `${role} login`, 'fail', error.message)
    return false
  }
}

async function testAdminNavigation(page: Page) {
  const navigationItems = [
    { name: 'Dashboard', url: '/admin/dashboard' },
    { name: 'Inventory Ledger', url: '/warehouse/inventory' },
    { name: 'Run Calculations', url: '/admin/calculations' },
    { name: 'Finance Dashboard', url: '/finance/dashboard' },
    { name: 'Invoices', url: '/finance/invoices' },
    { name: 'Reconciliation', url: '/finance/reconciliation' },
    { name: 'Reports', url: '/admin/reports' },
    { name: 'SKU Master', url: '/admin/settings/skus' },
    { name: 'Warehouse Configs', url: '/admin/settings/warehouse-configs' },
    { name: 'Cost Rates', url: '/admin/settings/rates' },
    { name: 'Users', url: '/admin/users' },
    { name: 'Amazon Integration', url: '/admin/amazon' },
    { name: 'Settings', url: '/admin/settings' },
  ]

  for (const item of navigationItems) {
    try {
      await page.click(`text="${item.name}"`)
      await page.waitForURL(`**${item.url}`)
      await logResult('Admin Navigation', item.name, 'pass')
    } catch (error) {
      await logResult('Admin Navigation', item.name, 'fail', error.message)
    }
  }
}

async function testCRUDOperations(page: Page) {
  // Test SKU CRUD
  try {
    await page.goto(`${BASE_URL}/admin/settings/skus`)
    await page.click('text="Add SKU"')
    await page.waitForURL('**/skus/new')
    
    // Fill form
    await page.fill('input[name="code"]', 'TEST-SKU-001')
    await page.fill('input[name="description"]', 'Test SKU Description')
    await page.fill('input[name="unit"]', 'Each')
    await page.click('button[type="submit"]')
    
    await page.waitForURL('**/skus')
    await logResult('CRUD Operations', 'Create SKU', 'pass')
    
    // Edit SKU
    await page.click('text="TEST-SKU-001"')
    await page.click('text="Edit"')
    await page.fill('input[name="description"]', 'Updated Test SKU Description')
    await page.click('button[type="submit"]')
    await logResult('CRUD Operations', 'Edit SKU', 'pass')
  } catch (error) {
    await logResult('CRUD Operations', 'SKU CRUD', 'fail', error.message)
  }

  // Test Warehouse Config CRUD
  try {
    await page.goto(`${BASE_URL}/admin/settings/warehouse-configs`)
    await page.click('text="Add Configuration"')
    await page.waitForURL('**/warehouse-configs/new')
    
    // Select warehouse and SKU
    await page.selectOption('select[name="warehouseId"]', { index: 1 })
    await page.selectOption('select[name="skuId"]', { index: 1 })
    await page.fill('input[name="cartonsPerPallet"]', '24')
    await page.fill('input[name="unitsPerCarton"]', '12')
    await page.click('button[type="submit"]')
    
    await logResult('CRUD Operations', 'Create Warehouse Config', 'pass')
  } catch (error) {
    await logResult('CRUD Operations', 'Warehouse Config CRUD', 'fail', error.message)
  }

  // Test Cost Rate CRUD
  try {
    await page.goto(`${BASE_URL}/admin/settings/rates`)
    await page.click('text="Add Rate"')
    await page.waitForURL('**/rates/new')
    
    await page.selectOption('select[name="warehouseId"]', { index: 1 })
    await page.selectOption('select[name="category"]', 'Storage')
    await page.fill('input[name="rate"]', '5.50')
    await page.click('button[type="submit"]')
    
    await logResult('CRUD Operations', 'Create Cost Rate', 'pass')
  } catch (error) {
    await logResult('CRUD Operations', 'Cost Rate CRUD', 'fail', error.message)
  }
}

async function testInventoryWorkflow(page: Page) {
  try {
    await page.goto(`${BASE_URL}/warehouse/inventory`)
    
    // Test tab switching
    await page.click('text="Current Balances"')
    await page.waitForSelector('text="SKU"')
    await logResult('Inventory', 'View Current Balances', 'pass')
    
    await page.click('text="Transaction Ledger"')
    await page.click('text="Add Transaction"')
    
    // Fill transaction form
    await page.selectOption('select[name="type"]', 'RECEIVE')
    await page.selectOption('select[name="warehouseId"]', { index: 1 })
    await page.selectOption('select[name="skuId"]', { index: 1 })
    await page.fill('input[name="quantity"]', '100')
    await page.fill('textarea[name="notes"]', 'Test inventory receipt')
    await page.click('button[type="submit"]')
    
    await logResult('Inventory', 'Add Transaction', 'pass')
  } catch (error) {
    await logResult('Inventory', 'Inventory Workflow', 'fail', error.message)
  }
}

async function testFinanceWorkflow(page: Page) {
  // Test invoice creation
  try {
    await page.goto(`${BASE_URL}/finance/invoices`)
    await page.click('text="Create Invoice"')
    await page.waitForURL('**/invoices/new')
    
    await page.fill('input[name="invoiceNumber"]', 'INV-TEST-001')
    await page.selectOption('select[name="warehouseId"]', { index: 1 })
    await page.fill('input[name="totalAmount"]', '1500.00')
    await page.click('button[type="submit"]')
    
    await logResult('Finance', 'Create Invoice', 'pass')
  } catch (error) {
    await logResult('Finance', 'Invoice Creation', 'fail', error.message)
  }

  // Test reconciliation
  try {
    await page.goto(`${BASE_URL}/finance/reconciliation`)
    await page.click('text="Run Reconciliation"')
    await page.waitForSelector('text="Reconciliation started"')
    await logResult('Finance', 'Run Reconciliation', 'pass')
  } catch (error) {
    await logResult('Finance', 'Reconciliation', 'fail', error.message)
  }
}

async function testReports(page: Page) {
  try {
    await page.goto(`${BASE_URL}/admin/reports`)
    
    // Test report generation
    await page.selectOption('select[name="reportType"]', 'inventory_summary')
    await page.click('text="Generate Report"')
    await page.waitForSelector('table')
    await logResult('Reports', 'Generate Inventory Report', 'pass')
    
    // Test export
    await page.click('text="Export"')
    await logResult('Reports', 'Export Report', 'pass')
  } catch (error) {
    await logResult('Reports', 'Report Generation', 'fail', error.message)
  }
}

async function testAmazonIntegration(page: Page) {
  try {
    await page.goto(`${BASE_URL}/admin/amazon`)
    await page.waitForSelector('text="Amazon Inventory Comparison"')
    
    // Test refresh
    await page.click('text="Refresh Data"')
    await page.waitForSelector('table')
    
    // Test search
    await page.fill('input[placeholder*="Search"]', 'TEST')
    await logResult('Amazon Integration', 'Inventory Comparison', 'pass')
  } catch (error) {
    await logResult('Amazon Integration', 'Amazon Page', 'fail', error.message)
  }
}

async function testStaffAccess(page: Page) {
  // Logout and login as staff
  await page.click('text="Sign out"')
  await testLogin(page, STAFF_EMAIL, STAFF_PASSWORD, 'Staff')

  const staffPages = [
    { name: 'Dashboard', url: '/warehouse/dashboard' },
    { name: 'Inventory Ledger', url: '/warehouse/inventory' },
    { name: 'Invoices', url: '/finance/invoices' },
    { name: 'Reports', url: '/warehouse/reports' },
  ]

  for (const item of staffPages) {
    try {
      await page.goto(`${BASE_URL}${item.url}`)
      await page.waitForLoadState('networkidle')
      await logResult('Staff Access', item.name, 'pass')
    } catch (error) {
      await logResult('Staff Access', item.name, 'fail', error.message)
    }
  }

  // Test restricted access
  try {
    await page.goto(`${BASE_URL}/admin/users`)
    await page.waitForURL('**/login')
    await logResult('Staff Access', 'Restricted access works', 'pass')
  } catch (error) {
    await logResult('Staff Access', 'Restricted access', 'fail', error.message)
  }
}

async function testButtonsAndInteractivity(page: Page) {
  // Login as admin again
  await testLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin')

  // Test various buttons and interactions
  const buttonTests = [
    { page: '/admin/settings', button: 'Warehouses', expectedUrl: '/admin/settings/warehouses' },
    { page: '/admin/calculations', button: 'Run All Calculations', expectedText: 'started' },
    { page: '/finance/dashboard', button: 'View Details', expectedUrl: '/finance/invoices' },
  ]

  for (const test of buttonTests) {
    try {
      await page.goto(`${BASE_URL}${test.page}`)
      await page.click(`text="${test.button}"`)
      
      if (test.expectedUrl) {
        await page.waitForURL(`**${test.expectedUrl}`)
      } else if (test.expectedText) {
        await page.waitForSelector(`text="${test.expectedText}"`)
      }
      
      await logResult('Button Functionality', `${test.page} - ${test.button}`, 'pass')
    } catch (error) {
      await logResult('Button Functionality', `${test.page} - ${test.button}`, 'fail', error.message)
    }
  }
}

async function runAllTests() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  })
  const page = await context.newPage()

  console.log('🧪 Starting Comprehensive UI Tests...\n')

  try {
    // Test authentication
    await testLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin')
    
    // Test admin navigation
    await testAdminNavigation(page)
    
    // Test CRUD operations
    await testCRUDOperations(page)
    
    // Test inventory workflow
    await testInventoryWorkflow(page)
    
    // Test finance workflow
    await testFinanceWorkflow(page)
    
    // Test reports
    await testReports(page)
    
    // Test Amazon integration
    await testAmazonIntegration(page)
    
    // Test staff access
    await testStaffAccess(page)
    
    // Test buttons and interactivity
    await testButtonsAndInteractivity(page)
    
  } catch (error) {
    console.error('Critical test error:', error)
  } finally {
    await browser.close()
  }

  // Print summary
  console.log('\n📊 Test Summary:')
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.section}: ${r.test} - ${r.error}`)
    })
  }
}

// Run the tests
runAllTests().catch(console.error)