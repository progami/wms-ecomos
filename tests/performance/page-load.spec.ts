import { test, expect } from '@playwright/test'

test.describe('⚡ Performance Tests - Page Load Times', () => {
  const MAX_LOAD_TIME = 3000 // 3 seconds
  const MAX_FIRST_PAINT = 1500 // 1.5 seconds
  
  test('Landing page performance', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate and wait for load
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const loadTime = Date.now() - startTime
    console.log(`Landing page load time: ${loadTime}ms`)
    
    // Check load time
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME)
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      }
    })
    
    console.log('Performance metrics:', metrics)
    
    // Assert performance thresholds
    expect(metrics.firstContentfulPaint).toBeLessThan(MAX_FIRST_PAINT)
  })

  test('Dashboard performance with data', async ({ page }) => {
    // Setup demo and navigate
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    
    // Measure dashboard reload
    const startTime = Date.now()
    await page.reload({ waitUntil: 'networkidle' })
    
    // Wait for main content
    await page.waitForSelector('text=Total SKUs')
    const loadTime = Date.now() - startTime
    
    console.log(`Dashboard load time: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME)
    
    // Check resource loading
    const resources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return resources.map(r => ({
        name: r.name.split('/').pop(),
        duration: Math.round(r.duration),
        size: r.transferSize,
        type: r.initiatorType
      })).filter(r => r.duration > 100) // Only show resources taking > 100ms
    })
    
    console.log('Slow resources:', resources)
  })

  test('SKU list page with pagination', async ({ page }) => {
    // Setup and navigate
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard')
    
    const startTime = Date.now()
    await page.click('a:has-text("SKUs")')
    await page.waitForURL('**/skus')
    await page.waitForSelector('table')
    
    const loadTime = Date.now() - startTime
    console.log(`SKU page load time: ${loadTime}ms`)
    
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME)
  })

  test('Memory usage monitoring', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard')
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024
      }
      return null
    })
    
    if (initialMemory) {
      console.log(`Initial memory usage: ${initialMemory.toFixed(2)} MB`)
      
      // Navigate through pages
      await page.click('a:has-text("SKUs")')
      await page.waitForURL('**/skus')
      await page.click('a:has-text("Inventory")')
      await page.waitForURL('**/operations/inventory')
      await page.click('a:has-text("Finance")')
      await page.waitForURL('**/finance')
      
      // Check memory after navigation
      const afterMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1024 / 1024
        }
        return null
      })
      
      if (afterMemory) {
        console.log(`Memory after navigation: ${afterMemory.toFixed(2)} MB`)
        const memoryIncrease = afterMemory - initialMemory
        console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`)
        
        // Memory increase should be reasonable (< 50MB)
        expect(memoryIncrease).toBeLessThan(50)
      }
    }
  })

  test('API response times', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/dashboard')
    
    // Monitor API calls
    const apiCalls: Array<{ url: string; duration: number }> = []
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const timing = response.timing()
        apiCalls.push({
          url: response.url().split('/api/')[1],
          duration: timing.responseEnd - timing.requestStart
        })
      }
    })
    
    // Reload to capture API calls
    await page.reload()
    await page.waitForSelector('text=Total SKUs')
    
    // Wait for API calls to complete
    await page.waitForTimeout(1000)
    
    console.log('API Response Times:')
    apiCalls.forEach(call => {
      console.log(`  ${call.url}: ${call.duration.toFixed(0)}ms`)
      
      // API calls should be fast (< 1 second)
      expect(call.duration).toBeLessThan(1000)
    })
  })

  test('Bundle size check', async ({ page }) => {
    const resources: Array<{ url: string; size: number }> = []
    
    page.on('response', async response => {
      const url = response.url()
      if (url.includes('_next/static/') && (url.endsWith('.js') || url.endsWith('.css'))) {
        const headers = response.headers()
        const size = parseInt(headers['content-length'] || '0')
        if (size > 0) {
          resources.push({ url: url.split('/').pop() || '', size })
        }
      }
    })
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Calculate total bundle size
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0)
    const totalSizeMB = totalSize / 1024 / 1024
    
    console.log(`Total bundle size: ${totalSizeMB.toFixed(2)} MB`)
    console.log('Large files:')
    resources
      .filter(r => r.size > 50 * 1024) // Files > 50KB
      .sort((a, b) => b.size - a.size)
      .forEach(r => {
        console.log(`  ${r.url}: ${(r.size / 1024).toFixed(1)} KB`)
      })
    
    // Total bundle should be reasonable (< 2MB)
    expect(totalSizeMB).toBeLessThan(2)
  })

  test('Time to interactive (TTI)', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle')
    
    // Measure time to interactive
    const tti = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        // Check if page is already interactive
        if (document.readyState === 'complete') {
          resolve(performance.now())
          return
        }
        
        // Wait for page to become interactive
        window.addEventListener('load', () => {
          // Additional delay to ensure JS is parsed
          setTimeout(() => {
            resolve(performance.now())
          }, 100)
        })
      })
    })
    
    console.log(`Time to Interactive: ${tti.toFixed(0)}ms`)
    expect(tti).toBeLessThan(3000) // Should be interactive within 3 seconds
  })

  test('Cumulative Layout Shift (CLS)', async ({ page }) => {
    // Navigate to page
    await page.goto('/')
    
    // Wait for initial render
    await page.waitForTimeout(1000)
    
    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let clsValue = 0
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue
            clsValue += (entry as any).value
          }
        })
        
        observer.observe({ entryTypes: ['layout-shift'] })
        
        // Observe for 2 seconds
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 2000)
      })
    })
    
    console.log(`Cumulative Layout Shift: ${cls.toFixed(3)}`)
    expect(cls).toBeLessThan(0.1) // Good CLS is less than 0.1
  })
})