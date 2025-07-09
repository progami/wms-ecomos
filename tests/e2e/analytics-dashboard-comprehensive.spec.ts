import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:3002'
const ADMIN_CREDENTIALS = {
  username: 'demo-admin',
  password: 'SecureWarehouse2024!'
}

// Helper functions
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('#emailOrUsername', ADMIN_CREDENTIALS.username)
  await page.fill('#password', ADMIN_CREDENTIALS.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

async function navigateToAnalytics(page: Page) {
  await page.click('a[href="/analytics"]')
  await page.waitForURL('**/analytics')
}

// Test chart interactions
async function testChartInteractions(page: Page, chartSelector: string) {
  const chart = page.locator(chartSelector)
  await expect(chart).toBeVisible()
  
  // Hover over chart points
  const chartArea = await chart.boundingBox()
  if (chartArea) {
    await page.mouse.move(chartArea.x + chartArea.width / 2, chartArea.y + chartArea.height / 2)
    await page.waitForTimeout(500)
    
    // Check for tooltip
    const tooltip = page.locator('[role="tooltip"], .chart-tooltip')
    if (await tooltip.isVisible()) {
      expect(await tooltip.textContent()).toBeTruthy()
    }
  }
  
  // Click on chart legend items
  const legendItems = chart.locator('.legend-item, [class*="legend"]')
  const legendCount = await legendItems.count()
  if (legendCount > 0) {
    await legendItems.first().click()
    await page.waitForTimeout(300)
  }
}

// Test filter functionality
async function testFilters(page: Page, filterType: string, value: string) {
  const filterSelector = `[data-testid="${filterType}-filter"], select[name="${filterType}"], input[name="${filterType}"]`
  const filter = page.locator(filterSelector)
  
  if (await filter.isVisible()) {
    const tagName = await filter.evaluate(el => el.tagName.toLowerCase())
    
    if (tagName === 'select') {
      await filter.selectOption(value)
    } else if (tagName === 'input') {
      await filter.fill(value)
    } else {
      await filter.click()
      await page.click(`text="${value}"`)
    }
    
    await page.waitForTimeout(500)
  }
}

test.describe('Analytics Dashboard - Overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
  })

  test('Analytics dashboard displays correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Analytics')
    
    // Check dashboard sections
    await expect(page.locator('text="Key Metrics"')).toBeVisible()
    await expect(page.locator('text="Performance Overview"')).toBeVisible()
    await expect(page.locator('text="Trends Analysis"')).toBeVisible()
    
    // Check date range selector
    await expect(page.locator('[data-testid="date-range-selector"]')).toBeVisible()
    
    // Check export button
    await expect(page.locator('button:has-text("Export Report")')).toBeVisible()
  })

  test('Key metrics cards', async ({ page }) => {
    // Check metric cards
    const metricCards = [
      'Total Revenue',
      'Orders Processed',
      'Average Order Value',
      'Inventory Turnover',
      'Fill Rate',
      'On-Time Delivery'
    ]
    
    for (const metric of metricCards) {
      const card = page.locator(`text="${metric}"`).locator('..')
      await expect(card).toBeVisible()
      
      // Check for value
      const value = card.locator('[data-testid="metric-value"], .metric-value')
      await expect(value).toBeVisible()
      
      // Check for trend indicator
      const trend = card.locator('[data-testid="metric-trend"], .trend-indicator')
      if (await trend.isVisible()) {
        const trendClass = await trend.getAttribute('class')
        expect(trendClass).toMatch(/up|down|neutral/)
      }
      
      // Check for percentage change
      const change = card.locator('[data-testid="metric-change"], .metric-change')
      if (await change.isVisible()) {
        expect(await change.textContent()).toMatch(/\d+(\.\d+)?%/)
      }
    }
  })

  test('Date range selector functionality', async ({ page }) => {
    const dateSelector = page.locator('[data-testid="date-range-selector"]')
    await dateSelector.click()
    
    // Check preset options
    await expect(page.locator('text="Today"')).toBeVisible()
    await expect(page.locator('text="Yesterday"')).toBeVisible()
    await expect(page.locator('text="Last 7 Days"')).toBeVisible()
    await expect(page.locator('text="Last 30 Days"')).toBeVisible()
    await expect(page.locator('text="This Month"')).toBeVisible()
    await expect(page.locator('text="Last Month"')).toBeVisible()
    await expect(page.locator('text="Custom Range"')).toBeVisible()
    
    // Select Last 7 Days
    await page.click('text="Last 7 Days"')
    await page.waitForTimeout(500)
    
    // Verify data updates
    await expect(page.locator('text="Loading"')).not.toBeVisible({ timeout: 5000 })
    
    // Test custom date range
    await dateSelector.click()
    await page.click('text="Custom Range"')
    
    // Check date pickers appear
    await expect(page.locator('input[name="startDate"]')).toBeVisible()
    await expect(page.locator('input[name="endDate"]')).toBeVisible()
    
    // Set custom dates
    await page.fill('input[name="startDate"]', '2024-01-01')
    await page.fill('input[name="endDate"]', '2024-01-31')
    await page.click('button:has-text("Apply")')
    
    await page.waitForTimeout(500)
  })

  test('Export functionality', async ({ page }) => {
    await page.click('button:has-text("Export Report")')
    
    // Check export options
    await expect(page.locator('h2:has-text("Export Analytics")')).toBeVisible()
    await expect(page.locator('text="Export Format"')).toBeVisible()
    await expect(page.locator('input[value="pdf"]')).toBeVisible()
    await expect(page.locator('input[value="excel"]')).toBeVisible()
    await expect(page.locator('input[value="csv"]')).toBeVisible()
    
    // Check report sections
    await expect(page.locator('text="Include Sections"')).toBeVisible()
    await expect(page.locator('input[name="includeMetrics"]')).toBeVisible()
    await expect(page.locator('input[name="includeCharts"]')).toBeVisible()
    await expect(page.locator('input[name="includeDetails"]')).toBeVisible()
    
    // Select options
    await page.click('input[value="pdf"]')
    await page.click('input[name="includeCharts"]')
    
    // Export
    await page.click('button:has-text("Export")')
    await expect(page.locator('text="Report generation started"')).toBeVisible()
  })

  test('Refresh data', async ({ page }) => {
    // Find refresh button
    const refreshButton = page.locator('button[aria-label="Refresh"], button:has-text("Refresh")')
    await expect(refreshButton).toBeVisible()
    
    // Click refresh
    await refreshButton.click()
    
    // Check loading state
    await expect(page.locator('text="Refreshing"')).toBeVisible()
    await expect(page.locator('text="Refreshing"')).not.toBeVisible({ timeout: 5000 })
  })

  test('Responsive grid layout', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    let metricCards = await page.locator('[data-testid="metric-card"]').boundingBox()
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Check if cards stack vertically on mobile
    const firstCard = await page.locator('[data-testid="metric-card"]').first().boundingBox()
    const secondCard = await page.locator('[data-testid="metric-card"]').nth(1).boundingBox()
    
    if (firstCard && secondCard) {
      expect(secondCard.y).toBeGreaterThan(firstCard.y + firstCard.height)
    }
  })
})

test.describe('Analytics Dashboard - Revenue Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
    await page.click('tab:has-text("Revenue")')
  })

  test('Revenue overview charts', async ({ page }) => {
    // Check revenue charts
    await expect(page.locator('text="Revenue Trend"')).toBeVisible()
    await expect(page.locator('text="Revenue by Category"')).toBeVisible()
    await expect(page.locator('text="Revenue by Warehouse"')).toBeVisible()
    await expect(page.locator('text="Top Revenue Products"')).toBeVisible()
    
    // Test revenue trend chart
    await testChartInteractions(page, '[data-testid="revenue-trend-chart"]')
  })

  test('Revenue filters', async ({ page }) => {
    // Test period filter
    await testFilters(page, 'period', 'monthly')
    await testFilters(page, 'period', 'quarterly')
    await testFilters(page, 'period', 'yearly')
    
    // Test category filter
    const categoryFilter = page.locator('select[name="category"]')
    if (await categoryFilter.isVisible()) {
      const options = await categoryFilter.locator('option').allTextContents()
      if (options.length > 1) {
        await categoryFilter.selectOption(options[1])
        await page.waitForTimeout(500)
      }
    }
    
    // Test warehouse filter
    const warehouseFilter = page.locator('select[name="warehouse"]')
    if (await warehouseFilter.isVisible()) {
      await warehouseFilter.selectOption({ index: 1 })
      await page.waitForTimeout(500)
    }
  })

  test('Revenue comparison', async ({ page }) => {
    await page.click('button:has-text("Compare Periods")')
    
    // Check comparison modal
    await expect(page.locator('h2:has-text("Revenue Comparison")')).toBeVisible()
    
    // Select periods to compare
    await expect(page.locator('text="Period 1"')).toBeVisible()
    await expect(page.locator('text="Period 2"')).toBeVisible()
    
    await page.selectOption('select[name="period1"]', 'last-month')
    await page.selectOption('select[name="period2"]', 'this-month')
    
    // Generate comparison
    await page.click('button:has-text("Compare")')
    await page.waitForTimeout(500)
    
    // Check comparison results
    await expect(page.locator('text="Comparison Results"')).toBeVisible()
    await expect(page.locator('text="% Change"')).toBeVisible()
  })

  test('Revenue breakdown table', async ({ page }) => {
    // Check if table exists
    const table = page.locator('table:has-text("Product")').or(page.locator('[data-testid="revenue-table"]'))
    await expect(table).toBeVisible()
    
    // Check table headers
    await expect(table.locator('th:has-text("Product")')).toBeVisible()
    await expect(table.locator('th:has-text("Quantity")')).toBeVisible()
    await expect(table.locator('th:has-text("Revenue")')).toBeVisible()
    await expect(table.locator('th:has-text("Margin")')).toBeVisible()
    
    // Test sorting
    await table.locator('th:has-text("Revenue")').click()
    await page.waitForTimeout(300)
    
    // Check sort indicator
    const sortIcon = table.locator('th:has-text("Revenue") svg')
    await expect(sortIcon).toBeVisible()
  })

  test('Revenue goals tracking', async ({ page }) => {
    // Check goals section
    await expect(page.locator('text="Revenue Goals"')).toBeVisible()
    
    const goalProgress = page.locator('[data-testid="goal-progress"]')
    if (await goalProgress.isVisible()) {
      // Check progress bar
      const progressBar = goalProgress.locator('[role="progressbar"]')
      await expect(progressBar).toBeVisible()
      
      // Check percentage
      const percentage = await progressBar.getAttribute('aria-valuenow')
      expect(Number(percentage)).toBeGreaterThanOrEqual(0)
      expect(Number(percentage)).toBeLessThanOrEqual(100)
    }
    
    // Set new goal
    const setGoalButton = page.locator('button:has-text("Set Goal")')
    if (await setGoalButton.isVisible()) {
      await setGoalButton.click()
      
      await expect(page.locator('h3:has-text("Set Revenue Goal")')).toBeVisible()
      await page.fill('input[name="goalAmount"]', '1000000')
      await page.fill('input[name="goalPeriod"]', '2024-Q1')
      await page.click('button:has-text("Save Goal")')
      
      await expect(page.locator('text="Goal saved"')).toBeVisible()
    }
  })

  test('Revenue forecast', async ({ page }) => {
    const forecastButton = page.locator('button:has-text("View Forecast")')
    if (await forecastButton.isVisible()) {
      await forecastButton.click()
      
      // Check forecast chart
      await expect(page.locator('text="Revenue Forecast"')).toBeVisible()
      await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible()
      
      // Check confidence intervals
      await expect(page.locator('text="Confidence Interval"')).toBeVisible()
      
      // Test forecast period adjustment
      const periodSlider = page.locator('input[type="range"][name="forecastPeriod"]')
      if (await periodSlider.isVisible()) {
        await periodSlider.fill('6')
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('Analytics Dashboard - Inventory Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
    await page.click('tab:has-text("Inventory")')
  })

  test('Inventory metrics display', async ({ page }) => {
    // Check inventory metrics
    await expect(page.locator('text="Market"')).toBeVisible()
    await expect(page.locator('text="Stock Value"')).toBeVisible()
    await expect(page.locator('text="Turnover Rate"')).toBeVisible()
    await expect(page.locator('text="Dead Stock"')).toBeVisible()
    await expect(page.locator('text="Stock Accuracy"')).toBeVisible()
  })

  test('Stock level charts', async ({ page }) => {
    // Check charts
    await expect(page.locator('text="Stock Levels by Category"')).toBeVisible()
    await expect(page.locator('text="Stock Movement Trend"')).toBeVisible()
    await expect(page.locator('text="ABC Analysis"')).toBeVisible()
    
    // Test ABC analysis chart
    const abcChart = page.locator('[data-testid="abc-analysis-chart"]')
    await testChartInteractions(page, '[data-testid="abc-analysis-chart"]')
    
    // Check ABC categories
    await expect(page.locator('text="A Items"')).toBeVisible()
    await expect(page.locator('text="B Items"')).toBeVisible()
    await expect(page.locator('text="C Items"')).toBeVisible()
  })

  test('Low stock alerts', async ({ page }) => {
    // Check alerts section
    await expect(page.locator('text="Low Stock Alerts"')).toBeVisible()
    
    const alertsList = page.locator('[data-testid="low-stock-list"]')
    if (await alertsList.isVisible()) {
      // Check alert items
      const alerts = alertsList.locator('[data-testid="alert-item"]')
      const alertCount = await alerts.count()
      
      if (alertCount > 0) {
        const firstAlert = alerts.first()
        await expect(firstAlert.locator('text="SKU:"')).toBeVisible()
        await expect(firstAlert.locator('text="Current:"')).toBeVisible()
        await expect(firstAlert.locator('text="Reorder:"')).toBeVisible()
        
        // Test quick reorder
        const reorderButton = firstAlert.locator('button:has-text("Reorder")')
        if (await reorderButton.isVisible()) {
          await reorderButton.click()
          await expect(page.locator('h3:has-text("Quick Reorder")')).toBeVisible()
          await page.click('button:has-text("Cancel")')
        }
      }
    }
  })

  test('Inventory aging analysis', async ({ page }) => {
    // Check aging section
    await expect(page.locator('text="Inventory Aging"')).toBeVisible()
    
    // Check aging buckets
    const agingBuckets = [
      '0-30 days',
      '31-60 days',
      '61-90 days',
      '90+ days'
    ]
    
    for (const bucket of agingBuckets) {
      const bucketElement = page.locator(`text="${bucket}"`)
      if (await bucketElement.isVisible()) {
        const value = bucketElement.locator('..').locator('[data-testid="bucket-value"]')
        await expect(value).toBeVisible()
      }
    }
    
    // View aged inventory details
    const viewDetailsButton = page.locator('button:has-text("View Aged Inventory")')
    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click()
      await expect(page.locator('h2:has-text("Aged Inventory Details")')).toBeVisible()
      await page.click('button:has-text("Close")')
    }
  })

  test('Stock movement analysis', async ({ page }) => {
    // Check movement patterns
    await expect(page.locator('text="Movement Patterns"')).toBeVisible()
    
    // Test movement filters
    await testFilters(page, 'movementType', 'inbound')
    await testFilters(page, 'movementType', 'outbound')
    await testFilters(page, 'movementType', 'adjustments')
    
    // Check velocity categories
    const velocitySection = page.locator('[data-testid="velocity-analysis"]')
    if (await velocitySection.isVisible()) {
      await expect(velocitySection.locator('text="Fast Moving"')).toBeVisible()
      await expect(velocitySection.locator('text="Slow Moving"')).toBeVisible()
      await expect(velocitySection.locator('text="Non-Moving"')).toBeVisible()
    }
  })

  test('Inventory optimization suggestions', async ({ page }) => {
    const optimizeButton = page.locator('button:has-text("Optimization Suggestions")')
    if (await optimizeButton.isVisible()) {
      await optimizeButton.click()
      
      // Check suggestions modal
      await expect(page.locator('h2:has-text("Inventory Optimization")')).toBeVisible()
      
      // Check suggestion categories
      await expect(page.locator('text="Reorder Point Adjustments"')).toBeVisible()
      await expect(page.locator('text="Excess Stock Reduction"')).toBeVisible()
      await expect(page.locator('text="SKU Rationalization"')).toBeVisible()
      
      // Apply suggestion
      const applySuggestion = page.locator('button:has-text("Apply")')
      if (await applySuggestion.first().isVisible()) {
        await applySuggestion.first().click()
        await expect(page.locator('text="Applied"')).toBeVisible()
      }
      
      await page.click('button:has-text("Close")')
    }
  })
})

test.describe('Analytics Dashboard - Operations Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
    await page.click('tab:has-text("Operations")')
  })

  test('Operations KPIs', async ({ page }) => {
    // Check KPI cards
    const kpis = [
      'Order Fill Rate',
      'Perfect Order Rate',
      'Cycle Time',
      'Productivity',
      'Accuracy Rate',
      'Utilization Rate'
    ]
    
    for (const kpi of kpis) {
      await expect(page.locator(`text="${kpi}"`)).toBeVisible()
    }
  })

  test('Warehouse performance comparison', async ({ page }) => {
    // Check warehouse comparison chart
    await expect(page.locator('text="Warehouse Performance"')).toBeVisible()
    
    const comparisonChart = page.locator('[data-testid="warehouse-comparison-chart"]')
    await testChartInteractions(page, '[data-testid="warehouse-comparison-chart"]')
    
    // Check metrics dropdown
    const metricsDropdown = page.locator('select[name="performanceMetric"]')
    if (await metricsDropdown.isVisible()) {
      await metricsDropdown.selectOption('fillRate')
      await page.waitForTimeout(500)
      await metricsDropdown.selectOption('accuracy')
      await page.waitForTimeout(500)
    }
  })

  test('Order processing analytics', async ({ page }) => {
    // Check order processing section
    await expect(page.locator('text="Order Processing"')).toBeVisible()
    
    // Check processing time chart
    const processingChart = page.locator('[data-testid="processing-time-chart"]')
    await expect(processingChart).toBeVisible()
    
    // Check order status breakdown
    await expect(page.locator('text="Order Status Breakdown"')).toBeVisible()
    const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    
    for (const status of statuses) {
      const statusElement = page.locator(`text="${status}"`).first()
      if (await statusElement.isVisible()) {
        const count = statusElement.locator('..').locator('[data-testid="status-count"]')
        await expect(count).toBeVisible()
      }
    }
  })

  test('Picking and packing efficiency', async ({ page }) => {
    // Check efficiency metrics
    await expect(page.locator('text="Picking Efficiency"')).toBeVisible()
    await expect(page.locator('text="Packing Efficiency"')).toBeVisible()
    
    // Test efficiency chart
    const efficiencyChart = page.locator('[data-testid="efficiency-chart"]')
    if (await efficiencyChart.isVisible()) {
      await testChartInteractions(page, '[data-testid="efficiency-chart"]')
    }
    
    // Check employee performance
    const employeeTab = page.locator('tab:has-text("By Employee")')
    if (await employeeTab.isVisible()) {
      await employeeTab.click()
      
      await expect(page.locator('text="Employee Performance"')).toBeVisible()
      const employeeTable = page.locator('[data-testid="employee-performance-table"]')
      await expect(employeeTable).toBeVisible()
    }
  })

  test('Shipping analytics', async ({ page }) => {
    // Check shipping section
    await expect(page.locator('text="Shipping Performance"')).toBeVisible()
    
    // Check carrier performance
    await expect(page.locator('text="Carrier Performance"')).toBeVisible()
    const carrierChart = page.locator('[data-testid="carrier-performance-chart"]')
    if (await carrierChart.isVisible()) {
      await testChartInteractions(page, '[data-testid="carrier-performance-chart"]')
    }
    
    // Check shipping costs
    await expect(page.locator('text="Shipping Costs"')).toBeVisible()
    const costTrend = page.locator('[data-testid="shipping-cost-trend"]')
    await expect(costTrend).toBeVisible()
    
    // Test cost breakdown
    const costBreakdown = page.locator('button:has-text("Cost Breakdown")')
    if (await costBreakdown.isVisible()) {
      await costBreakdown.click()
      await expect(page.locator('h3:has-text("Shipping Cost Breakdown")')).toBeVisible()
      await page.click('button:has-text("Close")')
    }
  })

  test('Returns and damages analytics', async ({ page }) => {
    // Check returns section
    await expect(page.locator('text="Returns Analytics"')).toBeVisible()
    
    // Check return reasons
    const returnReasons = page.locator('[data-testid="return-reasons-chart"]')
    if (await returnReasons.isVisible()) {
      await testChartInteractions(page, '[data-testid="return-reasons-chart"]')
    }
    
    // Check damage tracking
    await expect(page.locator('text="Damage Tracking"')).toBeVisible()
    const damageRate = page.locator('[data-testid="damage-rate"]')
    await expect(damageRate).toBeVisible()
    
    // View damage details
    const damageDetails = page.locator('button:has-text("View Details")')
    if (await damageDetails.first().isVisible()) {
      await damageDetails.first().click()
      await expect(page.locator('h3:has-text("Damage Details")')).toBeVisible()
      await page.click('button:has-text("Close")')
    }
  })
})

test.describe('Analytics Dashboard - Financial Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
    await page.click('tab:has-text("Financial")')
  })

  test('Financial overview', async ({ page }) => {
    // Check financial metrics
    await expect(page.locator('text="Gross Margin"')).toBeVisible()
    await expect(page.locator('text="Operating Costs"')).toBeVisible()
    await expect(page.locator('text="Net Profit"')).toBeVisible()
    await expect(page.locator('text="ROI"')).toBeVisible()
    
    // Check P&L summary
    await expect(page.locator('text="P&L Summary"')).toBeVisible()
  })

  test('Cost analysis', async ({ page }) => {
    // Check cost breakdown
    await expect(page.locator('text="Cost Breakdown"')).toBeVisible()
    
    const costChart = page.locator('[data-testid="cost-breakdown-chart"]')
    await testChartInteractions(page, '[data-testid="cost-breakdown-chart"]')
    
    // Check cost categories
    const costCategories = [
      'Labor Costs',
      'Storage Costs',
      'Transportation',
      'Equipment',
      'Utilities',
      'Other'
    ]
    
    for (const category of costCategories) {
      const categoryElement = page.locator(`text="${category}"`).first()
      if (await categoryElement.isVisible()) {
        const amount = categoryElement.locator('..').locator('[data-testid="cost-amount"]')
        await expect(amount).toBeVisible()
      }
    }
  })

  test('Budget vs actual analysis', async ({ page }) => {
    // Check budget comparison
    await expect(page.locator('text="Budget vs Actual"')).toBeVisible()
    
    const budgetChart = page.locator('[data-testid="budget-comparison-chart"]')
    await expect(budgetChart).toBeVisible()
    
    // Check variance analysis
    await expect(page.locator('text="Variance Analysis"')).toBeVisible()
    const varianceTable = page.locator('[data-testid="variance-table"]')
    
    if (await varianceTable.isVisible()) {
      await expect(varianceTable.locator('th:has-text("Category")')).toBeVisible()
      await expect(varianceTable.locator('th:has-text("Budget")')).toBeVisible()
      await expect(varianceTable.locator('th:has-text("Actual")')).toBeVisible()
      await expect(varianceTable.locator('th:has-text("Variance")')).toBeVisible()
    }
  })

  test('Cash flow analysis', async ({ page }) => {
    // Check cash flow section
    await expect(page.locator('text="Cash Flow"')).toBeVisible()
    
    const cashFlowChart = page.locator('[data-testid="cash-flow-chart"]')
    await expect(cashFlowChart).toBeVisible()
    
    // Check cash flow components
    await expect(page.locator('text="Operating Activities"')).toBeVisible()
    await expect(page.locator('text="Investing Activities"')).toBeVisible()
    await expect(page.locator('text="Financing Activities"')).toBeVisible()
    
    // Test forecast toggle
    const forecastToggle = page.locator('input[name="showForecast"]')
    if (await forecastToggle.isVisible()) {
      await forecastToggle.click()
      await page.waitForTimeout(500)
    }
  })

  test('Profitability by product/customer', async ({ page }) => {
    // Check profitability analysis
    await expect(page.locator('text="Profitability Analysis"')).toBeVisible()
    
    // Toggle between product and customer view
    const viewToggle = page.locator('[data-testid="profitability-view-toggle"]')
    if (await viewToggle.isVisible()) {
      await viewToggle.locator('button:has-text("By Product")').click()
      await page.waitForTimeout(500)
      
      await viewToggle.locator('button:has-text("By Customer")').click()
      await page.waitForTimeout(500)
    }
    
    // Check profitability table
    const profitTable = page.locator('[data-testid="profitability-table"]')
    await expect(profitTable).toBeVisible()
    
    // Test sorting
    await profitTable.locator('th:has-text("Profit Margin")').click()
    await page.waitForTimeout(300)
  })

  test('Financial projections', async ({ page }) => {
    const projectionsButton = page.locator('button:has-text("View Projections")')
    if (await projectionsButton.isVisible()) {
      await projectionsButton.click()
      
      // Check projections modal
      await expect(page.locator('h2:has-text("Financial Projections")')).toBeVisible()
      
      // Check projection scenarios
      await expect(page.locator('text="Conservative"')).toBeVisible()
      await expect(page.locator('text="Moderate"')).toBeVisible()
      await expect(page.locator('text="Optimistic"')).toBeVisible()
      
      // Select scenario
      await page.click('input[value="moderate"]')
      await page.waitForTimeout(500)
      
      // Check projection chart
      await expect(page.locator('[data-testid="projection-chart"]')).toBeVisible()
      
      await page.click('button:has-text("Close")')
    }
  })
})

test.describe('Analytics Dashboard - Custom Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
    await page.click('tab:has-text("Custom Reports")')
  })

  test('Custom report builder', async ({ page }) => {
    // Check report builder interface
    await expect(page.locator('h2:has-text("Report Builder")')).toBeVisible()
    
    // Check available data sources
    await expect(page.locator('text="Data Sources"')).toBeVisible()
    const dataSources = page.locator('[data-testid="data-sources-list"]')
    await expect(dataSources).toBeVisible()
    
    // Select data source
    await dataSources.locator('input[value="orders"]').click()
    
    // Check available fields
    await expect(page.locator('text="Available Fields"')).toBeVisible()
    const fieldsList = page.locator('[data-testid="fields-list"]')
    await expect(fieldsList).toBeVisible()
    
    // Drag and drop fields (simulate)
    const orderDateField = fieldsList.locator('text="Order Date"')
    const reportCanvas = page.locator('[data-testid="report-canvas"]')
    
    if (await orderDateField.isVisible() && await reportCanvas.isVisible()) {
      await orderDateField.dragTo(reportCanvas)
    }
  })

  test('Saved reports', async ({ page }) => {
    // Check saved reports section
    await expect(page.locator('text="Saved Reports"')).toBeVisible()
    
    const savedReportsList = page.locator('[data-testid="saved-reports-list"]')
    if (await savedReportsList.isVisible()) {
      const reports = savedReportsList.locator('[data-testid="report-item"]')
      const reportCount = await reports.count()
      
      if (reportCount > 0) {
        // Open first report
        await reports.first().click()
        await page.waitForTimeout(500)
        
        // Check report viewer
        await expect(page.locator('[data-testid="report-viewer"]')).toBeVisible()
        
        // Check report actions
        await expect(page.locator('button:has-text("Edit")')).toBeVisible()
        await expect(page.locator('button:has-text("Export")')).toBeVisible()
        await expect(page.locator('button:has-text("Schedule")')).toBeVisible()
      }
    }
  })

  test('Schedule report', async ({ page }) => {
    const scheduleButton = page.locator('button:has-text("Schedule Report")')
    if (await scheduleButton.first().isVisible()) {
      await scheduleButton.first().click()
      
      // Check schedule modal
      await expect(page.locator('h3:has-text("Schedule Report")')).toBeVisible()
      
      // Set schedule
      await expect(page.locator('select[name="frequency"]')).toBeVisible()
      await page.selectOption('select[name="frequency"]', 'weekly')
      
      await expect(page.locator('select[name="dayOfWeek"]')).toBeVisible()
      await page.selectOption('select[name="dayOfWeek"]', 'monday')
      
      await expect(page.locator('input[name="time"]')).toBeVisible()
      await page.fill('input[name="time"]', '09:00')
      
      // Set recipients
      await expect(page.locator('input[name="recipients"]')).toBeVisible()
      await page.fill('input[name="recipients"]', 'admin@example.com')
      
      // Save schedule
      await page.click('button:has-text("Save Schedule")')
      await expect(page.locator('text="Schedule saved"')).toBeVisible()
    }
  })

  test('Report templates', async ({ page }) => {
    await page.click('button:has-text("Templates")')
    
    // Check templates modal
    await expect(page.locator('h2:has-text("Report Templates")')).toBeVisible()
    
    // Check template categories
    await expect(page.locator('text="Operations"')).toBeVisible()
    await expect(page.locator('text="Financial"')).toBeVisible()
    await expect(page.locator('text="Inventory"')).toBeVisible()
    await expect(page.locator('text="Sales"')).toBeVisible()
    
    // Select a template
    const template = page.locator('[data-testid="template-item"]').first()
    if (await template.isVisible()) {
      await template.click()
      await page.click('button:has-text("Use Template")')
      
      // Check template loaded
      await expect(page.locator('text="Template loaded"')).toBeVisible()
    }
  })

  test('Report sharing', async ({ page }) => {
    const shareButton = page.locator('button:has-text("Share Report")')
    if (await shareButton.first().isVisible()) {
      await shareButton.first().click()
      
      // Check share modal
      await expect(page.locator('h3:has-text("Share Report")')).toBeVisible()
      
      // Check share options
      await expect(page.locator('text="Share with users"')).toBeVisible()
      await expect(page.locator('text="Share via link"')).toBeVisible()
      await expect(page.locator('text="Embed code"')).toBeVisible()
      
      // Generate share link
      await page.click('button:has-text("Generate Link")')
      await expect(page.locator('input[readonly]')).toBeVisible()
      
      // Copy link
      await page.click('button:has-text("Copy Link")')
      await expect(page.locator('text="Link copied"')).toBeVisible()
    }
  })
})

test.describe('Analytics Dashboard - Accessibility & Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAnalytics(page)
  })

  test('Keyboard navigation', async ({ page }) => {
    // Tab through main elements
    await page.keyboard.press('Tab')
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
    
    // Navigate through tabs
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
    }
    
    // Use arrow keys in charts
    const chart = page.locator('[data-testid="chart"]').first()
    if (await chart.isVisible()) {
      await chart.focus()
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
    }
    
    // Test escape key closes modals
    await page.click('button:has-text("Export Report")')
    await page.keyboard.press('Escape')
    await expect(page.locator('h2:has-text("Export Analytics")')).not.toBeVisible()
  })

  test('Screen reader compatibility', async ({ page }) => {
    // Check ARIA labels
    const charts = await page.locator('[role="img"]').all()
    for (const chart of charts.slice(0, 3)) {
      const ariaLabel = await chart.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    }
    
    // Check table accessibility
    const tables = await page.locator('table').all()
    for (const table of tables.slice(0, 2)) {
      const caption = await table.locator('caption').textContent()
      const ariaLabel = await table.getAttribute('aria-label')
      expect(caption || ariaLabel).toBeTruthy()
    }
    
    // Check form labels
    const inputs = await page.locator('input:not([type="hidden"])').all()
    for (const input of inputs.slice(0, 3)) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).textContent()
        expect(label).toBeTruthy()
      }
    }
  })

  test('Color contrast and visibility', async ({ page }) => {
    // Check high contrast mode toggle
    const contrastToggle = page.locator('button[aria-label*="contrast"], button:has-text("High Contrast")')
    if (await contrastToggle.isVisible()) {
      await contrastToggle.click()
      await page.waitForTimeout(300)
      
      // Verify contrast mode applied
      const body = page.locator('body')
      const className = await body.getAttribute('class')
      expect(className).toContain('high-contrast')
      
      // Toggle back
      await contrastToggle.click()
    }
  })

  test('Loading states and performance', async ({ page }) => {
    // Test lazy loading
    await page.reload()
    
    // Check loading indicators
    const loadingIndicators = page.locator('[aria-busy="true"], .loading, [data-testid="loading"]')
    const loadingCount = await loadingIndicators.count()
    
    if (loadingCount > 0) {
      // Wait for loading to complete
      await expect(loadingIndicators.first()).not.toBeVisible({ timeout: 10000 })
    }
    
    // Test chart rendering performance
    const startTime = Date.now()
    await page.click('tab:has-text("Revenue")')
    const endTime = Date.now()
    
    // Check tab switch is reasonably fast
    expect(endTime - startTime).toBeLessThan(2000)
  })

  test('Print view', async ({ page }) => {
    // Open print preview
    await page.emulateMedia({ media: 'print' })
    
    // Check print-specific styles
    const hiddenInPrint = await page.locator('.no-print, [data-print="hide"]').count()
    
    // Reset media
    await page.emulateMedia({ media: 'screen' })
    
    // Test print button
    const printButton = page.locator('button:has-text("Print")')
    if (await printButton.isVisible()) {
      // Mock print dialog
      page.on('dialog', dialog => dialog.accept())
      await printButton.click()
    }
  })

  test('Responsive chart behavior', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(500)
      
      // Check charts resize properly
      const chart = page.locator('[data-testid="chart"]').first()
      if (await chart.isVisible()) {
        const chartBox = await chart.boundingBox()
        expect(chartBox?.width).toBeLessThanOrEqual(viewport.width)
      }
      
      // Check if mobile menu appears on small screens
      if (viewport.width < 768) {
        const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label="Menu"]')
        await expect(mobileMenu).toBeVisible()
      }
    }
  })

  test('Error handling and recovery', async ({ page }) => {
    // Test error states
    // Simulate network error by intercepting requests
    await page.route('**/api/analytics/**', route => route.abort())
    
    // Reload page
    await page.reload()
    
    // Check error message appears
    await expect(page.locator('text="Failed to load"').or(page.locator('text="Error loading"'))).toBeVisible({ timeout: 10000 })
    
    // Check retry button
    const retryButton = page.locator('button:has-text("Retry")')
    if (await retryButton.isVisible()) {
      // Remove route interception
      await page.unroute('**/api/analytics/**')
      await retryButton.click()
      
      // Check data loads
      await expect(page.locator('text="Failed to load"')).not.toBeVisible({ timeout: 10000 })
    }
  })
})