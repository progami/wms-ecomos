const fetch = require('node-fetch').default
const { CookieJar } = require('tough-cookie')
const { wrapper } = require('fetch-cookie')
const fs = require('fs')
const path = require('path')

const fetchWithCookies = wrapper(fetch, new CookieJar())
const BASE_URL = 'http://localhost:3002'
const LOG_FILE = path.join(process.cwd(), 'logs', 'dev.log')

interface TestResult {
  endpoint: string
  status: number
  success: boolean
  responseTime: number
  errors: string[]
  warnings: string[]
  dbQueries: number
  slowQueries: number
}

class LogAnalyzer {
  private logPosition: number = 0

  constructor() {
    try {
      const stats = fs.statSync(LOG_FILE)
      this.logPosition = stats.size
    } catch (e) {
      console.error('Could not get log file size')
    }
  }

  getNewLogs(): string {
    try {
      const stats = fs.statSync(LOG_FILE)
      const currentSize = stats.size
      if (currentSize <= this.logPosition) return ''
      
      const buffer = Buffer.alloc(currentSize - this.logPosition)
      const fd = fs.openSync(LOG_FILE, 'r')
      fs.readSync(fd, buffer, 0, buffer.length, this.logPosition)
      fs.closeSync(fd)
      
      this.logPosition = currentSize
      return buffer.toString()
    } catch (e) {
      return ''
    }
  }

  analyzeLogs(logs: string) {
    const lines = logs.split('\n').filter(l => l.trim())
    const errors = lines.filter(l => l.includes('[ERROR]') || l.includes('[31m[1m⨯'))
    const warnings = lines.filter(l => l.includes('[WARN]') || l.includes('[33m[1m⚠'))
    const dbQueries = lines.filter(l => l.includes('[database]') || l.includes('prisma:query'))
    const slowQueries = lines.filter(l => {
      const match = l.match(/"duration":(\d+)/)
      return match && parseInt(match[1]) > 100
    })

    return {
      errors: errors.map(e => e.substring(0, 200)),
      warnings: warnings.map(w => w.substring(0, 200)),
      dbQueries: dbQueries.length,
      slowQueries: slowQueries.length
    }
  }
}

async function login() {
  // Get CSRF token
  const csrfResponse = await fetchWithCookies(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string }

  // Login
  const loginResponse = await fetchWithCookies(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
      csrfToken
    })
  })

  // Check session
  const sessionResponse = await fetchWithCookies(`${BASE_URL}/api/auth/session`)
  const session = await sessionResponse.json() as any
  
  if (!session.user) {
    throw new Error('Login failed')
  }

  console.log('✅ Logged in as:', session.user.email)
  return session
}

async function testEndpoint(name: string, path: string, analyzer: LogAnalyzer): Promise<TestResult> {
  console.log(`\n📊 Testing: ${name}`)
  
  // Clear logs
  analyzer.getNewLogs()
  
  const startTime = Date.now()
  const response = await fetchWithCookies(`${BASE_URL}${path}`, {
    headers: {
      'Accept': 'application/json, text/html',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  })
  const responseTime = Date.now() - startTime

  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const logs = analyzer.getNewLogs()
  const analysis = analyzer.analyzeLogs(logs)
  
  let bodyText = ''
  try {
    bodyText = await response.text()
  } catch (e) {}

  const result: TestResult = {
    endpoint: path,
    status: response.status,
    success: response.status === 200,
    responseTime,
    ...analysis
  }

  console.log(`  Status: ${response.status} ${result.success ? '✅' : '❌'}`)
  console.log(`  Response time: ${responseTime}ms`)
  console.log(`  DB Queries: ${analysis.dbQueries}`)
  if (analysis.slowQueries > 0) {
    console.log(`  ⚠️  Slow queries: ${analysis.slowQueries}`)
  }
  if (analysis.errors.length > 0) {
    console.log(`  ❌ Errors: ${analysis.errors.length}`)
    analysis.errors.forEach(e => console.log(`    - ${e}`))
  }
  if (analysis.warnings.length > 0) {
    console.log(`  ⚠️  Warnings: ${analysis.warnings.length}`)
  }

  // Check for common issues
  if (bodyText.includes('NaN') || bodyText.includes('undefined')) {
    console.log('  ⚠️  Found NaN or undefined in response')
  }

  return result
}

async function main() {
  console.log('🚀 Financial Workflows Test\n')
  
  const analyzer = new LogAnalyzer()
  const results: TestResult[] = []

  try {
    await login()
    
    // Test financial endpoints
    const endpoints = [
      { name: 'Finance Main Page', path: '/finance' },
      { name: 'Finance Dashboard', path: '/finance/dashboard' },
      { name: 'Invoice List', path: '/finance/invoices' },
      { name: 'Invoice Creation Form', path: '/finance/invoices/new' },
      { name: 'Cost Rates', path: '/finance/cost-rates' },
      { name: 'Reconciliation', path: '/finance/reconciliation' },
      { name: 'Storage Ledger', path: '/finance/storage-ledger' },
      { name: 'Cost Ledger', path: '/finance/cost-ledger' },
      { name: 'Financial Reports', path: '/finance/reports' },
    ]

    // Test API endpoints too
    const apiEndpoints = [
      { name: 'API: Dashboard Stats', path: '/api/dashboard/stats' },
      { name: 'API: Finance Dashboard', path: '/api/finance/dashboard' },
      { name: 'API: Invoices', path: '/api/finance/invoices' },
      { name: 'API: Cost Rates', path: '/api/finance/cost-rates' },
      { name: 'API: Storage Ledger', path: '/api/finance/storage-ledger' },
    ]

    for (const endpoint of [...endpoints, ...apiEndpoints]) {
      const result = await testEndpoint(endpoint.name, endpoint.path, analyzer)
      results.push(result)
    }

    // Generate report
    generateReport(results)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

function generateReport(results: TestResult[]) {
  let report = `# Financial Workflows Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total endpoints tested: ${results.length}
- Successful: ${results.filter(r => r.success).length}
- Failed: ${results.filter(r => !r.success).length}

## Page Load Performance

| Endpoint | Status | Response Time | DB Queries | Slow Queries | Errors | Warnings |
|----------|--------|---------------|------------|--------------|---------|----------|
`

  results.forEach(r => {
    const status = r.success ? '✅' : '❌'
    report += `| ${r.endpoint} | ${status} ${r.status} | ${r.responseTime}ms | ${r.dbQueries} | ${r.slowQueries} | ${r.errors.length} | ${r.warnings.length} |\n`
  })

  // Add detailed issues
  report += '\n## Detailed Issues\n'
  
  const failedEndpoints = results.filter(r => !r.success)
  if (failedEndpoints.length > 0) {
    report += '\n### Failed Endpoints\n'
    failedEndpoints.forEach(r => {
      report += `\n#### ${r.endpoint}\n`
      report += `- Status: ${r.status}\n`
      if (r.errors.length > 0) {
        report += '- Errors:\n'
        r.errors.forEach(e => report += `  - ${e}\n`)
      }
    })
  }

  const slowEndpoints = results.filter(r => r.responseTime > 1000)
  if (slowEndpoints.length > 0) {
    report += '\n### Slow Endpoints (>1s)\n'
    slowEndpoints.forEach(r => {
      report += `- ${r.endpoint}: ${r.responseTime}ms\n`
    })
  }

  const endpointsWithSlowQueries = results.filter(r => r.slowQueries > 0)
  if (endpointsWithSlowQueries.length > 0) {
    report += '\n### Endpoints with Slow Queries (>100ms)\n'
    endpointsWithSlowQueries.forEach(r => {
      report += `- ${r.endpoint}: ${r.slowQueries} slow queries\n`
    })
  }

  report += '\n## Recommendations\n'
  report += '1. Check any 404 errors - pages may not be implemented yet\n'
  report += '2. Investigate slow queries - consider adding database indexes\n'
  report += '3. Look for NaN/undefined values in calculations\n'
  report += '4. Verify cost rates are properly configured\n'
  report += '5. Ensure warehouse configurations exist for financial calculations\n'

  const reportPath = path.join(process.cwd(), 'financial-test-report.md')
  fs.writeFileSync(reportPath, report)
  console.log(`\n📄 Report saved to: ${reportPath}`)
}

main().catch(console.error)