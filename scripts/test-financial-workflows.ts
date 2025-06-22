import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const LOG_FILE = path.join(process.cwd(), 'logs', 'dev.log')
const REPORT_FILE = path.join(process.cwd(), 'financial-test-report.md')

interface TestResult {
  page: string
  loadTime: number
  success: boolean
  errors: string[]
  dbQueries: string[]
  warnings: string[]
  calculationIssues: string[]
}

class LogMonitor {
  private lastPosition: number = 0
  
  constructor() {
    // Get current file size
    try {
      const stats = fs.statSync(LOG_FILE)
      this.lastPosition = stats.size
    } catch (error) {
      console.error('Error accessing log file:', error)
    }
  }

  getNewLogs(): string[] {
    try {
      const stats = fs.statSync(LOG_FILE)
      const currentSize = stats.size
      
      if (currentSize === this.lastPosition) {
        return []
      }
      
      const buffer = Buffer.alloc(currentSize - this.lastPosition)
      const fd = fs.openSync(LOG_FILE, 'r')
      fs.readSync(fd, buffer, 0, buffer.length, this.lastPosition)
      fs.closeSync(fd)
      
      this.lastPosition = currentSize
      return buffer.toString().split('\n').filter(line => line.trim())
    } catch (error) {
      console.error('Error reading log file:', error)
      return []
    }
  }

  analyzeLogs(logs: string[]): {
    errors: string[]
    dbQueries: string[]
    warnings: string[]
    calculationIssues: string[]
  } {
    const errors: string[] = []
    const dbQueries: string[] = []
    const warnings: string[] = []
    const calculationIssues: string[] = []

    for (const log of logs) {
      // Database queries
      if (log.includes('[database]') || log.includes('prisma:query')) {
        dbQueries.push(log)
      }
      
      // Errors
      if (log.includes('[ERROR]') || log.includes('[31m[1m⨯')) {
        errors.push(log)
      }
      
      // Warnings
      if (log.includes('[WARN]') || log.includes('[33m[1m⚠')) {
        warnings.push(log)
      }
      
      // Calculation issues
      if (log.includes('calculation') || log.includes('NaN') || log.includes('undefined cost')) {
        calculationIssues.push(log)
      }
      
      // Slow queries (>100ms)
      const durationMatch = log.match(/"duration":(\d+)/)
      if (durationMatch && parseInt(durationMatch[1]) > 100) {
        warnings.push(`Slow query detected: ${log}`)
      }
    }

    return { errors, dbQueries, warnings, calculationIssues }
  }
}

async function testFinancialWorkflows() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const logMonitor = new LogMonitor()
  const results: TestResult[] = []

  // Login first
  console.log('🔐 Logging in...')
  await page.goto('http://localhost:3002/auth/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
  console.log('✅ Logged in successfully')

  // Test pages
  const testPages = [
    { name: 'Finance Main', path: '/finance' },
    { name: 'Finance Dashboard', path: '/finance/dashboard' },
    { name: 'Invoices', path: '/finance/invoices' },
    { name: 'Invoice Creation', path: '/finance/invoices/new', actions: async () => {
      // Try to interact with form elements
      try {
        await page.waitForSelector('form', { timeout: 5000 })
        console.log('  ✓ Invoice form loaded')
      } catch (e) {
        console.log('  ✗ Invoice form not found')
      }
    }},
    { name: 'Cost Rates', path: '/finance/cost-rates' },
    { name: 'Reconciliation', path: '/finance/reconciliation' },
    { name: 'Storage Ledger', path: '/finance/storage-ledger' },
    { name: 'Cost Ledger', path: '/finance/cost-ledger' },
    { name: 'Financial Reports', path: '/finance/reports' }
  ]

  for (const testPage of testPages) {
    console.log(`\n📄 Testing ${testPage.name}...`)
    
    // Clear log position to capture only logs for this page
    const startTime = Date.now()
    
    try {
      await page.goto(`http://localhost:3002${testPage.path}`)
      await page.waitForLoadState('networkidle')
      
      // Execute any page-specific actions
      if (testPage.actions) {
        await testPage.actions()
      }
      
      const loadTime = Date.now() - startTime
      console.log(`  ⏱️  Load time: ${loadTime}ms`)
      
      // Wait a bit for any async operations
      await page.waitForTimeout(1000)
      
      // Get new logs
      const newLogs = logMonitor.getNewLogs()
      const analysis = logMonitor.analyzeLogs(newLogs)
      
      results.push({
        page: testPage.name,
        loadTime,
        success: analysis.errors.length === 0,
        ...analysis
      })
      
      // Report immediate findings
      if (analysis.errors.length > 0) {
        console.log(`  ❌ ${analysis.errors.length} errors found`)
      }
      if (analysis.warnings.length > 0) {
        console.log(`  ⚠️  ${analysis.warnings.length} warnings found`)
      }
      if (analysis.calculationIssues.length > 0) {
        console.log(`  🧮 ${analysis.calculationIssues.length} calculation issues found`)
      }
      console.log(`  📊 ${analysis.dbQueries.length} database queries executed`)
      
    } catch (error) {
      console.log(`  ❌ Failed to load page: ${error.message}`)
      results.push({
        page: testPage.name,
        loadTime: Date.now() - startTime,
        success: false,
        errors: [`Page load failed: ${error.message}`],
        dbQueries: [],
        warnings: [],
        calculationIssues: []
      })
    }
  }

  // Generate report
  generateReport(results)
  
  await browser.close()
}

function generateReport(results: TestResult[]) {
  let report = `# Financial Workflows Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total pages tested: ${results.length}
- Successful: ${results.filter(r => r.success).length}
- Failed: ${results.filter(r => !r.success).length}

## Page Load Performance
| Page | Load Time | Status | DB Queries | Errors | Warnings |
|------|-----------|--------|------------|---------|----------|
`

  for (const result of results) {
    const status = result.success ? '✅' : '❌'
    report += `| ${result.page} | ${result.loadTime}ms | ${status} | ${result.dbQueries.length} | ${result.errors.length} | ${result.warnings.length} |\n`
  }

  report += '\n## Detailed Findings\n'

  for (const result of results) {
    report += `\n### ${result.page}\n`
    
    if (result.errors.length > 0) {
      report += '\n#### Errors:\n'
      result.errors.forEach(error => {
        report += `- ${error}\n`
      })
    }
    
    if (result.warnings.length > 0) {
      report += '\n#### Warnings:\n'
      result.warnings.forEach(warning => {
        report += `- ${warning}\n`
      })
    }
    
    if (result.calculationIssues.length > 0) {
      report += '\n#### Calculation Issues:\n'
      result.calculationIssues.forEach(issue => {
        report += `- ${issue}\n`
      })
    }
    
    if (result.dbQueries.length > 5) {
      report += `\n#### Database Activity:\n`
      report += `- Total queries: ${result.dbQueries.length}\n`
      const slowQueries = result.dbQueries.filter(q => q.includes('duration') && parseInt(q.match(/"duration":(\d+)/)?.[1] || '0') > 100)
      if (slowQueries.length > 0) {
        report += `- Slow queries (>100ms): ${slowQueries.length}\n`
      }
    }
  }

  // Configuration and missing data check
  report += '\n## Configuration Status\n'
  report += '- Cost rates configuration: Check /finance/cost-rates page\n'
  report += '- Invoice templates: Check if available in /finance/invoices/new\n'
  report += '- Reconciliation data: Check if warehouse charges are loaded\n'

  fs.writeFileSync(REPORT_FILE, report)
  console.log(`\n📋 Report saved to: ${REPORT_FILE}`)
}

// Run the test
testFinancialWorkflows().catch(console.error)