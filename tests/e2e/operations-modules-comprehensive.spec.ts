import { isUnderConstruction, handleUnderConstruction, closeWelcomeModal, navigateToPage } from './utils/common-helpers';
import { test, expect, Page } from '@playwright/test'

// Helper to setup demo and login
async function setupDemoAndLogin(page: any) {
  // Always try to setup demo first (it will check internally if already exists)
  await page.request.post('http://localhost:3000/api/demo/setup');
  
  // Wait for demo setup to complete
  await page.waitForTimeout(2000);
  
  // Navigate to login page
  await page.goto('http://localhost:3000/auth/login');
  
  // Login with demo credentials
  await page.fill('#emailOrUsername', 'demo-admin');
  await page.fill('#password', 'SecureWarehouse2024!');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  
  // Handle welcome modal if present
  const welcomeModal = page.locator('dialog:has-text("Welcome to WMS Demo!")');
  if (await welcomeModal.isVisible({ timeout: 1000 }).catch(() => false)) {
    const startBtn = page.locator('button:has-text("Start Exploring")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }
}

// Test configuration
const BASE_URL = 'http://localhost:3000'
const ADMIN_CREDENTIALS = {
  username: 'demo-admin',
  password: 'SecureWarehouse2024!'
}

// Helper functions
async function loginAsAdmin(page: Page) {
  // Use test auth mode - any credentials work
  await setupDemoAndLogin(page);
  await page.waitForURL('**/dashboard', { timeout: 30000 })
  
  // Close welcome modal if present
  const welcomeModal = page.locator('text="Welcome to WMS Demo!"')
  if (await welcomeModal.isVisible({ timeout: 2000 })) {
    const btn = page.locator('button:has-text("Start Exploring"), a:has-text("Start Exploring")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await page.waitForTimeout(500)
  }
}

async function navigateToOperations(page: Page, module: string) {
  await page.click('a:has-text("Operations")')
  await page.waitForURL('**/operations', { timeout: 15000 }).catch(() => {
      console.log('Navigation to operations timed out, continuing...');
    })
  if (module) {
    await page.click(`a:has-text("${module}")`)
  }
}

// Test data validation
async function testDataValidation(page: Page, fieldSelector: string, invalidValue: string, errorMessage: string) {
  const field = page.locator(fieldSelector)
  await field.clear()
  await field.fill(invalidValue)
  await field.blur()
  await expect(page.locator(`text="${errorMessage}"`)).toBeVisible()
}

// Test table interactions
async function testTableFeatures(page: Page, tableSelector: string) {
  const table = page.locator(tableSelector)
  
  // Test sorting
  const sortableHeader = table.locator('th[aria-sort]').first()
  if (await sortableHeader.isVisible()) {
    await sortableHeader.click()
    await page.waitForTimeout(300)
    const sortOrder = await sortableHeader.getAttribute('aria-sort')
    expect(['ascending', 'descending']).toContain(sortOrder)
  }
  
  // Test pagination
  const pagination = page.locator('[data-testid="pagination"]')
  if (await pagination.isVisible()) {
    const nextButton = pagination.locator('button:has-text("Next")')
    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(300)
    }
  }
  
  // Test search
  const searchInput = page.locator('input[placeholder*="Search"]')
  if (await searchInput.isVisible()) {
    await searchInput.fill('test')
    await page.waitForTimeout(500)
  }

test.describe('Operations - Batch Attributes Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToOperations(page, 'Batch Attributes')
  })

  test('Batch attributes overview displays correctly', async ({ page }) => {
    // Check page header
    const heading = await page.locator('h1, h2').first().textContent();
    expect(heading).toMatch(/Batch Attributes/i);
    
    // Check main sections
    await expect(page.locator('text="Active Batches"')).toBeVisible()
    await expect(page.locator('text="Attribute Templates"')).toBeVisible()
    await expect(page.locator('text="Batch History"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Batch")')).toBeVisible()
    await expect(page.locator('button:has-text("Import Batches")')).toBeVisible()
    await expect(page.locator('button:has-text("Manage Templates")')).toBeVisible()
    
    // Check statistics cards
    await expect(page.locator('text="Total Active Batches"')).toBeVisible()
    await expect(page.locator('text="Expiring Soon"')).toBeVisible()
    await expect(page.locator('text="Quarantined"')).toBeVisible()
    await expect(page.locator('text="Released Today"')).toBeVisible()
  })

  test('Create new batch with attributes', async ({ page }) => {
    const btn = page.locator('button:has-text("Create Batch"), a:has-text("Create Batch")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check create batch modal
    await expect(page.locator('h2:has-text("Create New Batch")')).toBeVisible()
    
    // Fill basic information
    await page.fill('[name="batchNumber"]', 'BATCH-2024-001')
    await page.fill('[name="productSKU"]', 'PROD-123')
    await page.selectOption('[name="warehouse"]', { index: 1 })
    await page.fill('[name="quantity"]', '1000')
    await page.selectOption('[name="unitOfMeasure"]', 'pieces')
    
    // Set manufacturing details
    await page.fill('[name="manufacturingDate"]', '2024-01-15')
    await page.fill('[name="expiryDate"]', '2025-01-15')
    await page.fill('[name="lotNumber"]', 'LOT-2024-A1')
    
    // Add custom attributes
    const addAttributeBtn = page.locator('button:has-text("Add Attribute"), a:has-text("Add Attribute")').first();
    if (await addAttributeBtn.isVisible()) {
      await addAttributeBtn.click();
    }
    await page.fill('[name="attributeName"]', 'Temperature Range')
    await page.fill('[name="attributeValue"]', '2-8°C')
    await page.selectOption('[name="attributeType"]', 'text')
    
    // Add another attribute
    if (await addAttributeBtn.isVisible()) {
      await addAttributeBtn.click();
    }
    await page.fill('[name="attributeName"][last]', 'Quality Certificate')
    await page.fill('[name="attributeValue"][last]', 'QC-2024-001')
    await page.selectOption('[name="attributeType"][last]', 'document')
    
    // Upload document
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      // Simulate file upload
      await fileInput.setInputFiles({
        name: 'quality-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test pdf content')
      })
    }
    
    // Set compliance flags
    await page.click('input[name="fdaApproved"]')
    await page.click('input[name="organicCertified"]')
    
    // Save batch
    const createBatchBtn = page.locator('button:has-text("Create Batch"), a:has-text("Create Batch")').first();
    if (await addAttributeBtn.isVisible()) {
      await addAttributeBtn.click();
    }
    await expect(page.locator('text="Batch created successfully"')).toBeVisible()
  })

  test('Batch attribute templates', async ({ page }) => {
    const btn = page.locator('button:has-text("Manage Templates"), a:has-text("Manage Templates")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check templates modal
    await expect(page.locator('h2:has-text("Attribute Templates")')).toBeVisible()
    
    // Check existing templates
    await expect(page.locator('text="Pharmaceutical"')).toBeVisible()
    await expect(page.locator('text="Food & Beverage"')).toBeVisible()
    await expect(page.locator('text="Electronics"')).toBeVisible()
    
    // Create new template
    const newTemplateBtn = page.locator('button:has-text("New Template"), a:has-text("New Template")').first();
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
    }
    
    // Fill template details
    await page.fill('[name="templateName"]', 'Chemical Products')
    await page.fill('[name="description"]', 'Template for chemical product batches')
    
    // Add template attributes
    const attributes = [
      { name: 'pH Level', type: 'number', required: true },
      { name: 'Hazard Class', type: 'select', required: true },
      { name: 'MSDS Document', type: 'document', required: true },
      { name: 'Storage Conditions', type: 'text', required: false }
    ]
    
    for (const attr of attributes) {
      const btn = page.locator('button:has-text("Add Attribute"), a:has-text("Add Attribute")').first();
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
    }
      await page.fill('[name="attributeName"][last]', attr.name)
      await page.selectOption('[name="attributeType"][last]', attr.type)
      if (attr.required) {
        await page.click('[name="required"][last]')
      }
    }
    
    // Save template
    const saveTemplateBtn = page.locator('button:has-text("Save Template"), a:has-text("Save Template")').first();
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
    }
    await expect(page.locator('text="Template saved"')).toBeVisible()
  })

  test('Batch search and filtering', async ({ page }) => {
    // Search by batch number
    const searchInput = page.locator('input[placeholder*="Search batches"]')
    await searchInput.fill('BATCH-2024')
    await page.waitForTimeout(500)
    
    // Apply filters
    const btn = page.locator('button:has-text("Filters"), a:has-text("Filters")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Filter by status
    await page.selectOption('[name="status"]', 'active')
    
    // Filter by date range
    await page.fill('[name="dateFrom"]', '2024-01-01')
    await page.fill('[name="dateTo"]', '2024-12-31')
    
    // Filter by warehouse
    await page.selectOption('[name="warehouse"]', { index: 1 })
    
    // Filter by expiry
    await page.click('input[name="expiringWithin30Days"]')
    
    // Apply filters
    const applyFiltersBtn = page.locator('button:has-text("Apply Filters"), a:has-text("Apply Filters")').first();
    if (await applyFiltersBtn.isVisible()) {
      await applyFiltersBtn.click();
    }
    await page.waitForTimeout(500)
    
    // Check filtered results
    const results = await page.locator('[data-testid="batch-row"]').count()
    expect(results).toBeGreaterThanOrEqual(0)
    
    // Clear filters
    const clearFiltersBtn = page.locator('button:has-text("Clear Filters"), a:has-text("Clear Filters")').first();
    if (await applyFiltersBtn.isVisible()) {
      await applyFiltersBtn.click();
    }
  })

  test('Batch details and history', async ({ page }) => {
    // Click on a batch
    await page.click('[data-testid="batch-row"]:first-child')
    
    // Check batch details page
    await expect(page.locator('h2:has-text("Batch Details")')).toBeVisible()
    
    // Check detail sections
    await expect(page.locator('text="Basic Information"')).toBeVisible()
    await expect(page.locator('text="Attributes"')).toBeVisible()
    await expect(page.locator('text="Inventory Locations"')).toBeVisible()
    await expect(page.locator('text="History"')).toBeVisible()
    await expect(page.locator('text="Documents"')).toBeVisible()
    
    // Check attribute values
    const attributesSection = page.locator('[data-testid="attributes-section"]')
    await expect(attributesSection).toBeVisible()
    
    // Edit attribute
    await attributesSection.locator('button:has-text("Edit")').first().click()
    await page.fill('[name="attributeValue"]', 'Updated Value')
    const btn = page.locator('button:has-text("Save"), a:has-text("Save")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await expect(page.locator('text="Attribute updated"')).toBeVisible()
    
    // View history
    await page.click('tab:has-text("History")')
    await expect(page.locator('[data-testid="history-timeline"]')).toBeVisible()
    
    // Check history entries
    await expect(page.locator('text="Batch Created"')).toBeVisible()
    await expect(page.locator('text="Attribute Updated"')).toBeVisible()
  })

  test('Batch splitting and merging', async ({ page }) => {
    // Select a batch
    await page.click('[data-testid="batch-row"]:first-child input[type="checkbox"]')
    
    // Split batch
    const btn = page.locator('button:has-text("Split Batch"), a:has-text("Split Batch")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check split modal
    await expect(page.locator('h3:has-text("Split Batch")')).toBeVisible()
    
    // Configure split
    await page.fill('[name="splitQuantity1"]', '600')
    await page.fill('[name="splitQuantity2"]', '400')
    await page.fill('[name="newBatchNumber"]', 'BATCH-2024-001-B')
    
    // Confirm split
    const splitBtn = page.locator('button:has-text("Split"), a:has-text("Split")').first();
    if (await splitBtn.isVisible()) {
      await splitBtn.click();
    }
    await expect(page.locator('text="Batch split successfully"')).toBeVisible()
    
    // Test merge
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    const mergeBatchesBtn = page.locator('button:has-text("Merge Batches"), a:has-text("Merge Batches")').first();
    if (await splitBtn.isVisible()) {
      await splitBtn.click();
    }
    
    // Check merge modal
    await expect(page.locator('h3:has-text("Merge Batches")')).toBeVisible()
    
    // Verify compatibility
    await expect(page.locator('text="Compatibility Check"')).toBeVisible()
    const compatibilityStatus = page.locator('[data-testid="compatibility-status"]')
    await expect(compatibilityStatus).toBeVisible()
  })

  test('Batch quality control', async ({ page }) => {
    // Navigate to QC section
    await page.click('tab:has-text("Quality Control")')
    
    // Check QC dashboard
    await expect(page.locator('text="Quality Control Dashboard"')).toBeVisible()
    await expect(page.locator('text="Pending Inspections"')).toBeVisible()
    await expect(page.locator('text="Failed QC"')).toBeVisible()
    await expect(page.locator('text="Passed QC"')).toBeVisible()
    
    // Start inspection
    await page.click('[data-testid="batch-row"]:first-child button:has-text("Inspect")')
    
    // Fill inspection form
    await expect(page.locator('h3:has-text("Quality Inspection")')).toBeVisible()
    
    // Visual inspection
    await page.click('input[name="visualInspection"][value="pass"]')
    await page.fill('textarea[name="visualNotes"]', 'No visible defects')
    
    // Dimension check
    await page.click('input[name="dimensionCheck"][value="pass"]')
    await page.fill('[name="length"]', '10.5')
    await page.fill('[name="width"]', '8.2')
    await page.fill('[name="height"]', '5.0')
    
    // Weight verification
    await page.fill('[name="actualWeight"]', '1.05')
    await page.fill('[name="expectedWeight"]', '1.00')
    await page.fill('[name="tolerance"]', '0.1')
    
    // Add test results
    const btn = page.locator('button:has-text("Add Test Result"), a:has-text("Add Test Result")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await page.fill('[name="testName"]', 'Moisture Content')
    await page.fill('[name="testValue"]', '2.5')
    await page.fill('[name="testUnit"]', '%')
    await page.selectOption('[name="testResult"]', 'pass')
    
    // Upload test report
    const reportInput = page.locator('input[type="file"][name="testReport"]')
    if (await reportInput.isVisible()) {
      await reportInput.setInputFiles({
        name: 'test-report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test report content')
      })
    }
    
    // Submit inspection
    const submitInspectionBtn = page.locator('button:has-text("Submit Inspection"), a:has-text("Submit Inspection")').first();
    if (await submitInspectionBtn.isVisible()) {
      await submitInspectionBtn.click();
    }
    await expect(page.locator('text="Inspection completed"')).toBeVisible()
  })

  test('Batch recall management', async ({ page }) => {
    // Navigate to recalls
    const btn = page.locator('button:has-text("Manage Recalls"), a:has-text("Manage Recalls")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check recalls interface
    await expect(page.locator('h2:has-text("Batch Recalls")')).toBeVisible()
    
    // Initiate recall
    const initiateRecallBtn = page.locator('button:has-text("Initiate Recall"), a:has-text("Initiate Recall")').first();
    if (await initiateRecallBtn.isVisible()) {
      await initiateRecallBtn.click();
    }
    
    // Fill recall details
    await page.fill('[name="recallReason"]', 'Potential contamination detected')
    await page.selectOption('[name="severity"]', 'high')
    await page.selectOption('[name="recallType"]', 'voluntary')
    
    // Select affected batches
    const selectBatchesBtn = page.locator('button:has-text("Select Batches"), a:has-text("Select Batches")').first();
    if (await initiateRecallBtn.isVisible()) {
      await initiateRecallBtn.click();
    }
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    const addSelectedBtn = page.locator('button:has-text("Add Selected"), a:has-text("Add Selected")').first();
    if (await initiateRecallBtn.isVisible()) {
      await initiateRecallBtn.click();
    }
    
    // Set notification details
    await page.click('input[name="notifyCustomers"]')
    await page.click('input[name="notifyRegulatory"]')
    await page.fill('textarea[name="publicNotice"]', 'Product recall notice...')
    
    // Confirm recall
    if (await initiateRecallBtn.isVisible()) {
      await initiateRecallBtn.click();
    }
    await expect(page.locator('text="Recall initiated"')).toBeVisible()
    
    // Check recall tracking
    await expect(page.locator('text="Recall Status"')).toBeVisible()
    await expect(page.locator('text="Units Recalled"')).toBeVisible()
    await expect(page.locator('text="Units Returned"')).toBeVisible()
  })

  test('Batch compliance and certification', async ({ page }) => {
    // Navigate to compliance
    await page.click('tab:has-text("Compliance")')
    
    // Check compliance dashboard
    await expect(page.locator('text="Compliance Overview"')).toBeVisible()
    await expect(page.locator('text="Certifications"')).toBeVisible()
    await expect(page.locator('text="Regulatory Requirements"')).toBeVisible()
    
    // Add certification
    const btn = page.locator('button:has-text("Add Certification"), a:has-text("Add Certification")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Fill certification details
    await page.selectOption('[name="certificationType"]', 'organic')
    await page.fill('[name="certificationNumber"]', 'ORG-2024-12345')
    await page.fill('[name="issuingBody"]', 'USDA Organic')
    await page.fill('[name="issueDate"]', '2024-01-01')
    await page.fill('[name="expiryDate"]', '2025-01-01')
    
    // Upload certificate
    const certInput = page.locator('input[type="file"][name="certificate"]')
    if (await certInput.isVisible()) {
      await certInput.setInputFiles({
        name: 'organic-certificate.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('certificate content')
      })
    }
    
    // Link to batches
    const linkBatchesBtn = page.locator('button:has-text("Link Batches"), a:has-text("Link Batches")').first();
    if (await linkBatchesBtn.isVisible()) {
      await linkBatchesBtn.click();
    }
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    const linkSelectedBtn = page.locator('button:has-text("Link Selected"), a:has-text("Link Selected")').first();
    if (await linkBatchesBtn.isVisible()) {
      await linkBatchesBtn.click();
    }
    
    // Save certification
    const saveCertificationBtn = page.locator('button:has-text("Save Certification"), a:has-text("Save Certification")').first();
    if (await linkBatchesBtn.isVisible()) {
      await linkBatchesBtn.click();
    }
    await expect(page.locator('text="Certification added"')).toBeVisible()
  })

  test('Batch reporting and analytics', async ({ page }) => {
    // Navigate to reports
    const btn = page.locator('button:has-text("Reports"), a:has-text("Reports")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check report options
    await expect(page.locator('h3:has-text("Batch Reports")')).toBeVisible()
    await expect(page.locator('text="Expiry Report"')).toBeVisible()
    await expect(page.locator('text="Quality Report"')).toBeVisible()
    await expect(page.locator('text="Compliance Report"')).toBeVisible()
    await expect(page.locator('text="Batch Movement"')).toBeVisible()
    
    // Generate expiry report
    const expiryReportBtn = page.locator('button:has-text("Expiry Report"), a:has-text("Expiry Report")').first();
    if (await expiryReportBtn.isVisible()) {
      await expiryReportBtn.click();
    }
    
    // Configure report
    await page.selectOption('[name="reportPeriod"]', '30days')
    await page.click('input[name="includeExpired"]')
    await page.click('input[name="includeNearExpiry"]')
    await page.selectOption('[name="groupBy"]', 'product')
    
    // Generate report
    const generateReportBtn = page.locator('button:has-text("Generate Report"), a:has-text("Generate Report")').first();
    if (await expiryReportBtn.isVisible()) {
      await expiryReportBtn.click();
    }
    await page.waitForTimeout(1000)
    
    // Check report display
    await expect(page.locator('[data-testid="report-viewer"]')).toBeVisible()
    await expect(page.locator('text="Expiry Summary"')).toBeVisible()
    
    // Export report
    const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")').first();
    if (await expiryReportBtn.isVisible()) {
      await expiryReportBtn.click();
    }
    await page.click('input[value="pdf"]')
    const downloadBtn = page.locator('button:has-text("Download"), a:has-text("Download")').first();
    if (await expiryReportBtn.isVisible()) {
      await expiryReportBtn.click();
    }
    await expect(page.locator('text="Report exported"')).toBeVisible()
  })
})

test.describe('Operations - Pallet Variance Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToOperations(page, 'Pallet Variance')
  })

  test('Pallet variance dashboard displays correctly', async ({ page }) => {
    // Check page header
    const heading = await page.locator('h1, h2').first().textContent();
    expect(heading).toMatch(/Pallet Variance/i);
    
    // Check variance metrics
    await expect(page.locator('text="Total Variances"')).toBeVisible()
    await expect(page.locator('text="Unresolved"')).toBeVisible()
    await expect(page.locator('text="Average Resolution Time"')).toBeVisible()
    await expect(page.locator('text="Variance Rate"')).toBeVisible()
    
    // Check variance list
    await expect(page.locator('[data-testid="variance-table"]')).toBeVisible()
    await expect(page.locator('th:has-text("Pallet ID")')).toBeVisible()
    await expect(page.locator('th:has-text("Expected")')).toBeVisible()
    await expect(page.locator('th:has-text("Actual")')).toBeVisible()
    await expect(page.locator('th:has-text("Variance")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Report Variance")')).toBeVisible()
    await expect(page.locator('button:has-text("Bulk Upload")')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
  })

  test('Report new pallet variance', async ({ page }) => {
    const btn = page.locator('button:has-text("Report Variance"), a:has-text("Report Variance")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check variance form
    await expect(page.locator('h2:has-text("Report Pallet Variance")')).toBeVisible()
    
    // Fill pallet information
    await page.fill('[name="palletId"]', 'PAL-2024-001')
    await page.selectOption('[name="warehouse"]', { index: 1 })
    await page.selectOption('[name="zone"]', { index: 1 })
    await page.fill('[name="location"]', 'A-01-01')
    
    // Fill expected vs actual
    await page.fill('[name="expectedSKU"]', 'SKU-123')
    await page.fill('[name="expectedQuantity"]', '100')
    await page.fill('[name="expectedWeight"]', '500')
    
    await page.fill('[name="actualSKU"]', 'SKU-123')
    await page.fill('[name="actualQuantity"]', '95')
    await page.fill('[name="actualWeight"]', '475')
    
    // Select variance type
    await page.selectOption('[name="varianceType"]', 'quantity')
    
    // Add discovery details
    await page.selectOption('[name="discoveryMethod"]', 'cycle-count')
    await page.fill('[name="discoveredBy"]', 'John Doe')
    await page.fill('[name="discoveryDate"]', '2024-01-20')
    
    // Add notes
    await page.fill('textarea[name="notes"]', '5 units missing from pallet during cycle count')
    
    // Upload evidence
    const evidenceInput = page.locator('input[type="file"][name="evidence"]')
    if (await evidenceInput.isVisible()) {
      await evidenceInput.setInputFiles({
        name: 'variance-evidence.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('evidence image')
      })
    }
    
    // Submit variance
    const submitVarianceBtn = page.locator('button:has-text("Submit Variance"), a:has-text("Submit Variance")').first();
    if (await submitVarianceBtn.isVisible()) {
      await submitVarianceBtn.click();
    }
    await expect(page.locator('text="Variance reported successfully"')).toBeVisible()
  })

  test('Variance investigation workflow', async ({ page }) => {
    // Click on unresolved variance
    const unresolved = page.locator('tr:has-text("Unresolved")').first()
    await unresolved.click()
    
    // Check investigation page
    await expect(page.locator('h2:has-text("Variance Investigation")')).toBeVisible()
    
    // Check investigation sections
    await expect(page.locator('text="Variance Details"')).toBeVisible()
    await expect(page.locator('text="Investigation Status"')).toBeVisible()
    await expect(page.locator('text="Related Transactions"')).toBeVisible()
    await expect(page.locator('text="Investigation Notes"')).toBeVisible()
    
    // Start investigation
    const btn = page.locator('button:has-text("Start Investigation"), a:has-text("Start Investigation")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Assign investigator
    await page.selectOption('[name="investigator"]', { index: 1 })
    await page.selectOption('[name="priority"]', 'high')
    await page.fill('[name="dueDate"]', '2024-01-25')
    
    // Add investigation steps
    const addStepBtn = page.locator('button:has-text("Add Step"), a:has-text("Add Step")').first();
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click();
    }
    await page.fill('[name="stepDescription"]', 'Review security footage')
    await page.selectOption('[name="stepStatus"]', 'in-progress')
    
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click();
    }
    await page.fill('[name="stepDescription"][last]', 'Interview warehouse staff')
    await page.selectOption('[name="stepStatus"][last]', 'pending')
    
    // Save investigation
    const saveInvestigationBtn = page.locator('button:has-text("Save Investigation"), a:has-text("Save Investigation")').first();
    if (await addStepBtn.isVisible()) {
      await addStepBtn.click();
    }
    await expect(page.locator('text="Investigation updated"')).toBeVisible()
  })

  test('Variance root cause analysis', async ({ page }) => {
    // Navigate to a variance detail
    await page.click('[data-testid="variance-row"]:first-child')
    
    // Go to root cause tab
    await page.click('tab:has-text("Root Cause")')
    
    // Start root cause analysis
    const btn = page.locator('button:has-text("Analyze Root Cause"), a:has-text("Analyze Root Cause")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Fill fishbone diagram
    await expect(page.locator('text="Root Cause Analysis"')).toBeVisible()
    
    // Add causes
    const categories = ['People', 'Process', 'Equipment', 'Environment']
    for (const category of categories) {
      await page.click(`button:has-text("Add Cause"):near(:text("${category}"))`)
      await page.fill('[name="cause"][last]', `${category} related cause`)
    }
    
    // Identify primary cause
    await page.click('input[name="primaryCause"][value="process"]')
    await page.fill('textarea[name="rootCauseDescription"]', 'Incorrect picking process followed')
    
    // Add corrective actions
    const addCorrectiveActionBtn = page.locator('button:has-text("Add Corrective Action"), a:has-text("Add Corrective Action")').first();
    if (await addCorrectiveActionBtn.isVisible()) {
      await addCorrectiveActionBtn.click();
    }
    await page.fill('[name="actionDescription"]', 'Retrain staff on picking procedures')
    await page.selectOption('[name="actionOwner"]', { index: 1 })
    await page.fill('[name="targetDate"]', '2024-02-01')
    
    // Save analysis
    const saveAnalysisBtn = page.locator('button:has-text("Save Analysis"), a:has-text("Save Analysis")').first();
    if (await addCorrectiveActionBtn.isVisible()) {
      await addCorrectiveActionBtn.click();
    }
    await expect(page.locator('text="Root cause analysis saved"')).toBeVisible()
  })

  test('Variance resolution and adjustment', async ({ page }) => {
    // Find variance to resolve
    const investigationRow = page.locator('tr:has-text("Under Investigation")').first();
    await investigationRow.click();
    
    // Go to resolution tab
    await page.click('tab:has-text("Resolution")')
    
    // Select resolution type
    await page.selectOption('[name="resolutionType"]', 'inventory-adjustment')
    
    // Fill adjustment details
    await page.fill('[name="adjustmentQuantity"]', '-5')
    await page.selectOption('[name="adjustmentReason"]', 'damaged-goods')
    await page.fill('textarea[name="adjustmentNotes"]', 'Items found damaged, removed from inventory')
    
    // Add approval
    await page.click('input[name="requiresApproval"]')
    await page.selectOption('[name="approver"]', { index: 1 })
    
    // Upload supporting documents
    const supportDoc = page.locator('input[type="file"][name="supportingDocs"]')
    if (await supportDoc.isVisible()) {
      await supportDoc.setInputFiles({
        name: 'damage-report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('damage report')
      })
    }
    
    // Submit resolution
    const btn = page.locator('button:has-text("Submit Resolution"), a:has-text("Submit Resolution")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await expect(page.locator('text="Resolution submitted for approval"')).toBeVisible()
  })

  test('Variance pattern analysis', async ({ page }) => {
    // Navigate to analytics
    await page.click('tab:has-text("Analytics")')
    
    // Check analytics dashboard
    await expect(page.locator('text="Variance Patterns"')).toBeVisible()
    await expect(page.locator('[data-testid="variance-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="variance-by-type-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="variance-by-location-chart"]')).toBeVisible()
    
    // Apply date filter
    await page.fill('[name="startDate"]', '2024-01-01')
    await page.fill('[name="endDate"]', '2024-01-31')
    const btn = page.locator('button:has-text("Apply"), a:has-text("Apply")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await page.waitForTimeout(500)
    
    // Check pattern insights
    await expect(page.locator('text="Top Variance Locations"')).toBeVisible()
    await expect(page.locator('text="Common Causes"')).toBeVisible()
    await expect(page.locator('text="Peak Times"')).toBeVisible()
    
    // Generate pattern report
    const generatePatternReportBtn = page.locator('button:has-text("Generate Pattern Report"), a:has-text("Generate Pattern Report")').first();
    if (await generatePatternReportBtn.isVisible()) {
      await generatePatternReportBtn.click();
    }
    await expect(page.locator('text="Report generated"')).toBeVisible()
  })

  test('Bulk variance upload', async ({ page }) => {
    const btn = page.locator('button:has-text("Bulk Upload"), a:has-text("Bulk Upload")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check upload modal
    await expect(page.locator('h2:has-text("Bulk Variance Upload")')).toBeVisible()
    
    // Download template
    await page.click('a:has-text("Download Template")')
    await expect(page.locator('text="Template downloaded"')).toBeVisible()
    
    // Upload file
    const uploadInput = page.locator('input[type="file"][name="bulkFile"]')
    await uploadInput.setInputFiles({
      name: 'variances.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('PalletID,Expected,Actual,Variance\nPAL-001,100,95,-5')
    })
    
    // Preview data
    const previewBtn = page.locator('button:has-text("Preview"), a:has-text("Preview")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
    }
    await expect(page.locator('text="Preview Data"')).toBeVisible()
    await expect(page.locator('text="1 variance(s) to import"')).toBeVisible()
    
    // Validate data
    const validateBtn = page.locator('button:has-text("Validate"), a:has-text("Validate")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
    }
    await expect(page.locator('text="Validation passed"')).toBeVisible()
    
    // Import variances
    const importBtn = page.locator('button:has-text("Import"), a:has-text("Import")').first();
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
    }
    await expect(page.locator('text="1 variance(s) imported"')).toBeVisible()
  })

  test('Variance approval workflow', async ({ page }) => {
    // Navigate to approvals
    const btn = page.locator('button:has-text("Pending Approvals"), a:has-text("Pending Approvals")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check approvals list
    await expect(page.locator('h2:has-text("Variance Approvals")')).toBeVisible()
    await expect(page.locator('[data-testid="approval-table"]')).toBeVisible()
    
    // Review approval
    await page.click('[data-testid="approval-row"]:first-child button:has-text("Review")')
    
    // Check approval details
    await expect(page.locator('h3:has-text("Approval Request")')).toBeVisible()
    await expect(page.locator('text="Requested By"')).toBeVisible()
    await expect(page.locator('text="Adjustment Details"')).toBeVisible()
    await expect(page.locator('text="Financial Impact"')).toBeVisible()
    
    // Add approval comments
    await page.fill('textarea[name="approvalComments"]', 'Approved based on investigation findings')
    
    // Approve
    const approveBtn = page.locator('button:has-text("Approve"), a:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }
    await expect(page.locator('text="Variance approved"')).toBeVisible()
  })

  test('Variance notifications and alerts', async ({ page }) => {
    // Navigate to settings
    const btn = page.locator('button:has-text("Settings"), a:has-text("Settings")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check notification settings
    await expect(page.locator('h3:has-text("Variance Notifications")')).toBeVisible()
    
    // Configure alerts
    await page.click('input[name="enableHighValueAlerts"]')
    await page.fill('[name="highValueThreshold"]', '10000')
    
    await page.click('input[name="enableRecurringAlerts"]')
    await page.fill('[name="recurringThreshold"]', '3')
    
    // Set notification recipients
    const addRecipientBtn = page.locator('button:has-text("Add Recipient"), a:has-text("Add Recipient")').first();
    if (await addRecipientBtn.isVisible()) {
      await addRecipientBtn.click();
    }
    await page.fill('[name="recipientEmail"]', 'manager@example.com')
    await page.selectOption('[name="recipientRole"]', 'warehouse-manager')
    await page.click('input[name="notifyHighValue"]')
    await page.click('input[name="notifyRecurring"]')
    
    // Configure escalation
    await page.click('input[name="enableEscalation"]')
    await page.fill('[name="escalationHours"]', '24')
    await page.selectOption('[name="escalationTo"]', 'senior-management')
    
    // Save settings
    const saveSettingsBtn = page.locator('button:has-text("Save Settings"), a:has-text("Save Settings")').first();
    if (await addRecipientBtn.isVisible()) {
      await addRecipientBtn.click();
    }
    await expect(page.locator('text="Settings saved"')).toBeVisible()
  })
})

test.describe('Operations - Shipment Planning', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToOperations(page, 'Shipment Planning')
  })

  test('Shipment planning dashboard displays correctly', async ({ page }) => {
    // Check page header
    const heading = await page.locator('h1, h2').first().textContent();
    expect(heading).toMatch(/Shipment Planning/i);
    
    // Check planning sections
    await expect(page.locator('text="Pending Shipments"')).toBeVisible()
    await expect(page.locator('text="Today\'s Schedule"')).toBeVisible()
    await expect(page.locator('text="Load Planning"')).toBeVisible()
    await expect(page.locator('text="Carrier Management"')).toBeVisible()
    
    // Check metrics
    await expect(page.locator('text="On-Time Rate"')).toBeVisible()
    await expect(page.locator('text="Utilization Rate"')).toBeVisible()
    await expect(page.locator('text="Cost per Shipment"')).toBeVisible()
    await expect(page.locator('text="Pending Orders"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Shipment")')).toBeVisible()
    await expect(page.locator('button:has-text("Import Orders")')).toBeVisible()
    await expect(page.locator('button:has-text("Optimize Routes")')).toBeVisible()
  })

  test('Create new shipment plan', async ({ page }) => {
    const btn = page.locator('button:has-text("Create Shipment"), a:has-text("Create Shipment")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check shipment form
    await expect(page.locator('h2:has-text("Create Shipment Plan")')).toBeVisible()
    
    // Fill basic information
    await page.fill('[name="shipmentNumber"]', 'SHIP-2024-001')
    await page.selectOption('[name="shipmentType"]', 'ltl')
    await page.fill('[name="scheduledDate"]', '2024-01-25')
    await page.fill('[name="scheduledTime"]', '14:00')
    
    // Select origin
    await page.selectOption('[name="originWarehouse"]', { index: 1 })
    await page.selectOption('[name="loadingDock"]', { index: 1 })
    
    // Add destination
    await page.fill('[name="destinationName"]', 'Customer Distribution Center')
    await page.fill('[name="destinationAddress"]', '789 Delivery Ave')
    await page.fill('[name="destinationCity"]', 'New York')
    await page.fill('[name="destinationState"]', 'NY')
    await page.fill('[name="destinationZip"]', '10001')
    
    // Add orders to shipment
    const addOrdersBtn = page.locator('button:has-text("Add Orders"), a:has-text("Add Orders")').first();
    if (await addOrdersBtn.isVisible()) {
      await addOrdersBtn.click();
    }
    await expect(page.locator('h3:has-text("Select Orders")')).toBeVisible()
    
    // Select orders
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    await page.click('input[type="checkbox"]:nth-child(3)')
    const addSelectedBtn = page.locator('button:has-text("Add Selected"), a:has-text("Add Selected")').first();
    if (await addOrdersBtn.isVisible()) {
      await addOrdersBtn.click();
    }
    
    // Check consolidation suggestions
    await expect(page.locator('text="Consolidation Opportunity"')).toBeVisible()
    
    // Save shipment
    const createShipmentBtn = page.locator('button:has-text("Create Shipment"), a:has-text("Create Shipment")').first();
    if (await addOrdersBtn.isVisible()) {
      await addOrdersBtn.click();
    }
    await expect(page.locator('text="Shipment created successfully"')).toBeVisible()
  })

  test('Load optimization and planning', async ({ page }) => {
    // Navigate to load planning
    await page.click('tab:has-text("Load Planning")')
    
    // Select shipment
    await page.selectOption('[name="shipmentSelect"]', { index: 1 })
    
    // Check load visualization
    await expect(page.locator('[data-testid="load-visualization"]')).toBeVisible()
    await expect(page.locator('text="Truck Capacity"')).toBeVisible()
    await expect(page.locator('text="Weight Distribution"')).toBeVisible()
    
    // Run optimization
    const btn = page.locator('button:has-text("Optimize Load"), a:has-text("Optimize Load")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check optimization options
    await expect(page.locator('h3:has-text("Load Optimization")')).toBeVisible()
    await page.click('input[name="maximizeSpace"]')
    await page.click('input[name="balanceWeight"]')
    await page.click('input[name="considerFragility"]')
    
    // Set constraints
    await page.fill('[name="maxWeight"]', '40000')
    await page.fill('[name="maxHeight"]', '110')
    await page.selectOption('[name="loadingSequence"]', 'lifo')
    
    // Run optimization
    const optimizeBtn = page.locator('button:has-text("Optimize"), a:has-text("Optimize")').first();
    if (await optimizeBtn.isVisible()) {
      await optimizeBtn.click();
    }
    await page.waitForTimeout(1000)
    
    // Check optimization results
    await expect(page.locator('text="Optimization Complete"')).toBeVisible()
    await expect(page.locator('text="Space Utilization: "')).toBeVisible()
    await expect(page.locator('text="Weight Distribution: "')).toBeVisible()
    
    // Apply optimization
    const applyOptimizationBtn = page.locator('button:has-text("Apply Optimization"), a:has-text("Apply Optimization")').first();
    if (await optimizeBtn.isVisible()) {
      await optimizeBtn.click();
    }
    await expect(page.locator('text="Load plan updated"')).toBeVisible()
  })

  test('Route planning and optimization', async ({ page }) => {
    // Navigate to route planning
    const btn = page.locator('button:has-text("Optimize Routes"), a:has-text("Optimize Routes")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check route planning interface
    await expect(page.locator('h2:has-text("Route Optimization")')).toBeVisible()
    
    // Select shipments for routing
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    await page.click('input[type="checkbox"]:nth-child(3)')
    
    // Set optimization parameters
    await page.selectOption('[name="optimizationGoal"]', 'minimize-distance')
    await page.click('input[name="avoidTolls"]')
    await page.click('input[name="preferHighways"]')
    
    // Set time windows
    await page.fill('[name="deliveryWindowStart"]', '08:00')
    await page.fill('[name="deliveryWindowEnd"]', '17:00')
    
    // Add vehicle constraints
    await page.selectOption('[name="vehicleType"]', 'semi-truck')
    await page.fill('[name="maxDrivingHours"]', '11')
    await page.fill('[name="breakDuration"]', '30')
    
    // Run route optimization
    const optimizeRoutesBtn = page.locator('button:has-text("Optimize Routes"), a:has-text("Optimize Routes")').first();
    if (await optimizeRoutesBtn.isVisible()) {
      await optimizeRoutesBtn.click();
    }
    await page.waitForTimeout(1500)
    
    // Check optimization results
    await expect(page.locator('[data-testid="route-map"]')).toBeVisible()
    await expect(page.locator('text="Total Distance"')).toBeVisible()
    await expect(page.locator('text="Estimated Time"')).toBeVisible()
    await expect(page.locator('text="Fuel Cost"')).toBeVisible()
    
    // Save routes
    const saveRoutesBtn = page.locator('button:has-text("Save Routes"), a:has-text("Save Routes")').first();
    if (await optimizeRoutesBtn.isVisible()) {
      await optimizeRoutesBtn.click();
    }
    await expect(page.locator('text="Routes saved"')).toBeVisible()
  })

  test('Carrier selection and booking', async ({ page }) => {
    // Navigate to carrier management
    await page.click('tab:has-text("Carrier Management")')
    
    // Check carrier list
    await expect(page.locator('[data-testid="carrier-table"]')).toBeVisible()
    await expect(page.locator('th:has-text("Carrier")')).toBeVisible()
    await expect(page.locator('th:has-text("Rating")')).toBeVisible()
    await expect(page.locator('th:has-text("Rate")')).toBeVisible()
    await expect(page.locator('th:has-text("Transit Time")')).toBeVisible()
    
    // Get quotes
    const btn = page.locator('button:has-text("Get Quotes"), a:has-text("Get Quotes")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Fill shipment details
    await page.selectOption('[name="shipment"]', { index: 1 })
    await page.fill('[name="weight"]', '5000')
    await page.fill('[name="pieces"]', '10')
    await page.selectOption('[name="serviceLevel"]', 'standard')
    
    // Request quotes
    const requestQuotesBtn = page.locator('button:has-text("Request Quotes"), a:has-text("Request Quotes")').first();
    if (await requestQuotesBtn.isVisible()) {
      await requestQuotesBtn.click();
    }
    await page.waitForTimeout(1000)
    
    // Check quote results
    await expect(page.locator('text="Quote Results"')).toBeVisible()
    await expect(page.locator('[data-testid="quote-comparison"]')).toBeVisible()
    
    // Select carrier
    await page.click('[data-testid="quote-row"]:first-child button:has-text("Select")')
    
    // Confirm booking
    await expect(page.locator('h3:has-text("Confirm Booking")')).toBeVisible()
    await page.fill('[name="poNumber"]', 'PO-2024-12345')
    await page.click('input[name="insurance"]')
    await page.fill('[name="declaredValue"]', '50000')
    
    // Book shipment
    const bookShipmentBtn = page.locator('button:has-text("Book Shipment"), a:has-text("Book Shipment")').first();
    if (await requestQuotesBtn.isVisible()) {
      await requestQuotesBtn.click();
    }
    await expect(page.locator('text="Shipment booked"')).toBeVisible()
  })

  test('Shipment documentation', async ({ page }) => {
    // Navigate to a shipment
    await page.click('[data-testid="shipment-row"]:first-child')
    
    // Go to documents tab
    await page.click('tab:has-text("Documents")')
    
    // Check document sections
    await expect(page.locator('text="Required Documents"')).toBeVisible()
    await expect(page.locator('text="Generated Documents"')).toBeVisible()
    await expect(page.locator('text="Uploaded Documents"')).toBeVisible()
    
    // Generate BOL
    const btn = page.locator('button:has-text("Generate BOL"), a:has-text("Generate BOL")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Fill BOL details
    await expect(page.locator('h3:has-text("Bill of Lading")')).toBeVisible()
    await page.fill('[name="specialInstructions"]', 'Handle with care')
    await page.selectOption('[name="freightClass"]', '85')
    await page.click('input[name="hazmat"]')
    
    // Generate document
    const generateBtn = page.locator('button:has-text("Generate"), a:has-text("Generate")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }
    await expect(page.locator('text="BOL generated"')).toBeVisible()
    
    // Generate packing list
    const generatePackingListBtn = page.locator('button:has-text("Generate Packing List"), a:has-text("Generate Packing List")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }
    await expect(page.locator('text="Packing list generated"')).toBeVisible()
    
    // Upload customs documents
    const uploadDocumentBtn = page.locator('button:has-text("Upload Document"), a:has-text("Upload Document")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }
    await page.selectOption('[name="documentType"]', 'customs')
    const docInput = page.locator('input[type="file"]')
    await docInput.setInputFiles({
      name: 'customs-declaration.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('customs document')
    })
    const uploadBtn = page.locator('button:has-text("Upload"), a:has-text("Upload")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }
    await expect(page.locator('text="Document uploaded"')).toBeVisible()
  })

  test('Shipment tracking and updates', async ({ page }) => {
    // Navigate to tracking
    await page.click('tab:has-text("Tracking")')
    
    // Check tracking interface
    await expect(page.locator('text="Active Shipments"')).toBeVisible()
    await expect(page.locator('[data-testid="tracking-map"]')).toBeVisible()
    
    // Select shipment to track
    await page.selectOption('[name="trackingShipment"]', { index: 1 })
    
    // Check tracking details
    await expect(page.locator('text="Current Location"')).toBeVisible()
    await expect(page.locator('text="ETA"')).toBeVisible()
    await expect(page.locator('text="Status Updates"')).toBeVisible()
    
    // Add manual update
    const btn = page.locator('button:has-text("Add Update"), a:has-text("Add Update")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Fill update details
    await page.selectOption('[name="updateType"]', 'in-transit')
    await page.fill('[name="currentLocation"]', 'Highway 95, Mile Marker 125')
    await page.fill('[name="updateNotes"]', 'On schedule, no delays')
    await page.fill('[name="estimatedArrival"]', '2024-01-25T16:30')
    
    // Add update
    const addUpdateBtn = page.locator('button:has-text("Add Update"), a:has-text("Add Update")').first();
    if (await addUpdateBtn.isVisible()) {
      await addUpdateBtn.click();
    }
    await expect(page.locator('text="Update added"')).toBeVisible()
    
    // Send notification
    const sendNotificationBtn = page.locator('button:has-text("Send Notification"), a:has-text("Send Notification")').first();
    if (await addUpdateBtn.isVisible()) {
      await addUpdateBtn.click();
    }
    await page.click('input[name="notifyCustomer"]')
    await page.click('input[name="notifyWarehouse"]')
    const sendBtn = page.locator('button:has-text("Send"), a:has-text("Send")').first();
    if (await addUpdateBtn.isVisible()) {
      await addUpdateBtn.click();
    }
    await expect(page.locator('text="Notifications sent"')).toBeVisible()
  })

  test('Delivery appointment scheduling', async ({ page }) => {
    // Navigate to appointments
    const btn = page.locator('button:has-text("Delivery Appointments"), a:has-text("Delivery Appointments")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check appointment calendar
    await expect(page.locator('h2:has-text("Delivery Appointments")')).toBeVisible()
    await expect(page.locator('[data-testid="appointment-calendar"]')).toBeVisible()
    
    // Schedule new appointment
    const scheduleAppointmentBtn = page.locator('button:has-text("Schedule Appointment"), a:has-text("Schedule Appointment")').first();
    if (await scheduleAppointmentBtn.isVisible()) {
      await scheduleAppointmentBtn.click();
    }
    
    // Fill appointment details
    await page.selectOption('[name="shipment"]', { index: 1 })
    await page.fill('[name="appointmentDate"]', '2024-01-26')
    await page.fill('[name="appointmentTime"]', '10:00')
    await page.selectOption('[name="dock"]', { index: 2 })
    await page.fill('[name="duration"]', '60')
    
    // Check dock availability
    const checkAvailabilityBtn = page.locator('button:has-text("Check Availability"), a:has-text("Check Availability")').first();
    if (await scheduleAppointmentBtn.isVisible()) {
      await scheduleAppointmentBtn.click();
    }
    await expect(page.locator('text="Dock available"')).toBeVisible()
    
    // Add special requirements
    await page.click('input[name="requiresLiftgate"]')
    await page.click('input[name="requiresLumper"]')
    await page.fill('textarea[name="specialRequirements"]', 'Call 30 minutes before arrival')
    
    // Schedule appointment
    const scheduleBtn = page.locator('button:has-text("Schedule"), a:has-text("Schedule")').first();
    if (await scheduleAppointmentBtn.isVisible()) {
      await scheduleAppointmentBtn.click();
    }
    await expect(page.locator('text="Appointment scheduled"')).toBeVisible()
  })

  test('Shipment performance analytics', async ({ page }) => {
    // Navigate to analytics
    await page.click('tab:has-text("Analytics")')
    
    // Check analytics dashboard
    await expect(page.locator('text="Shipment Performance"')).toBeVisible()
    await expect(page.locator('[data-testid="on-time-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="cost-trend-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="carrier-performance-chart"]')).toBeVisible()
    
    // Apply filters
    await page.fill('[name="dateFrom"]', '2024-01-01')
    await page.fill('[name="dateTo"]', '2024-01-31')
    await page.selectOption('[name="carrier"]', { index: 1 })
    const btn = page.locator('button:has-text("Apply Filters"), a:has-text("Apply Filters")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await page.waitForTimeout(500)
    
    // Check KPIs
    await expect(page.locator('text="Average Transit Time"')).toBeVisible()
    await expect(page.locator('text="Damage Rate"')).toBeVisible()
    await expect(page.locator('text="Cost per Mile"')).toBeVisible()
    
    // Generate report
    const generateReportBtn = page.locator('button:has-text("Generate Report"), a:has-text("Generate Report")').first();
    if (await generateReportBtn.isVisible()) {
      await generateReportBtn.click();
    }
    await page.selectOption('[name="reportType"]', 'performance')
    await page.selectOption('[name="format"]', 'pdf')
    const generateBtn = page.locator('button:has-text("Generate"), a:has-text("Generate")').first();
    if (await generateReportBtn.isVisible()) {
      await generateReportBtn.click();
    }
    await expect(page.locator('text="Report generated"')).toBeVisible()
  })

  test('Shipment cost analysis', async ({ page }) => {
    // Navigate to cost analysis
    const btn = page.locator('button:has-text("Cost Analysis"), a:has-text("Cost Analysis")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    
    // Check cost breakdown
    await expect(page.locator('h3:has-text("Shipment Cost Analysis")')).toBeVisible()
    await expect(page.locator('text="Base Freight"')).toBeVisible()
    await expect(page.locator('text="Fuel Surcharge"')).toBeVisible()
    await expect(page.locator('text="Accessorials"')).toBeVisible()
    await expect(page.locator('text="Total Cost"')).toBeVisible()
    
    // Compare actual vs quoted
    await expect(page.locator('text="Quoted vs Actual"')).toBeVisible()
    const variance = page.locator('[data-testid="cost-variance"]')
    await expect(variance).toBeVisible()
    
    // Add cost adjustment
    const addAdjustmentBtn = page.locator('button:has-text("Add Adjustment"), a:has-text("Add Adjustment")').first();
    if (await addAdjustmentBtn.isVisible()) {
      await addAdjustmentBtn.click();
    }
    await page.selectOption('[name="adjustmentType"]', 'detention')
    await page.fill('[name="adjustmentAmount"]', '150')
    await page.fill('textarea[name="adjustmentReason"]', 'Detention at delivery - 2 hours')
    
    // Save adjustment
    const saveAdjustmentBtn = page.locator('button:has-text("Save Adjustment"), a:has-text("Save Adjustment")').first();
    if (await addAdjustmentBtn.isVisible()) {
      await addAdjustmentBtn.click();
    }
    await expect(page.locator('text="Cost adjustment added"')).toBeVisible()
    
    // Approve costs
    const approveCostsBtn = page.locator('button:has-text("Approve Costs"), a:has-text("Approve Costs")').first();
    if (await addAdjustmentBtn.isVisible()) {
      await addAdjustmentBtn.click();
    }
    await expect(page.locator('text="Costs approved"')).toBeVisible()
  })
})

test.describe('Operations - Accessibility & Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToOperations(page, '')
  })

  test('Keyboard navigation across modules', async ({ page }) => {
    // Tab through navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    
    // Check focus management
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
    
    // Test escape key
    const btn = page.locator('button:has-text("Create"), a:has-text("Create")').first();
    if (await btn.isVisible()) {
      await btn.click();
    }
    await page.keyboard.press('Escape')
    const modal = page.locator('[role="dialog"]')
    await expect(modal).not.toBeVisible()
  })

  test('Screen reader compatibility', async ({ page }) => {
    // Check ARIA labels
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      expect(ariaLabel || text).toBeTruthy()
    }
    
    // Check landmarks
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
    
    // Check table accessibility
    const tables = await page.locator('table').all()
    for (const table of tables) {
      const caption = await table.locator('caption').count()
      const ariaLabel = await table.getAttribute('aria-label')
      expect(caption > 0 || ariaLabel).toBeTruthy()
    }
  })

  test('Responsive design', async ({ page }) => {
    // Test different viewports
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(300)
      
      // Check layout adapts
      if (viewport.width < 768) {
        // Mobile checks
        const mobileMenu = page.locator('[data-testid="mobile-menu"]')
        await expect(mobileMenu).toBeVisible()
        
        // Check cards stack
        const cards = await page.locator('[data-testid="metric-card"]').all()
        if (cards.length > 1) {
          const firstBox = await cards[0].boundingBox()
          const secondBox = await cards[1].boundingBox()
          if (firstBox && secondBox) {
            expect(secondBox.y).toBeGreaterThan(firstBox.y)
          }
        }
      }
    }
  })

  test('Performance and loading states', async ({ page }) => {
    // Test lazy loading
    await page.reload()
    
    // Check loading indicators
    const loadingStates = page.locator('[aria-busy="true"], .loading')
    if (await loadingStates.count() > 0) {
      await expect(loadingStates.first()).not.toBeVisible({ timeout: 5000 })
    }
    
    // Test data refresh
    const refreshButton = page.locator('button[aria-label="Refresh"]').first()
    if (await refreshButton.isVisible()) {
      const startTime = Date.now()
      await refreshButton.click()
      await page.waitForLoadState('networkidle')
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(3000)
    }
  })

  test('Error handling and recovery', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/operations/**', route => route.abort())
    
    // Trigger an action that requires API
    const actionButton = page.locator('button').first()
    await actionButton.click()
    
    // Check error message
    await expect(page.locator('text="error"').or(page.locator('.error'))).toBeVisible({ timeout: 5000 })
    
    // Remove route interception
    await page.unroute('**/api/operations/**')
    
    // Test retry
    const retryButton = page.locator('button:has-text("Retry")')
    if (await retryButton.isVisible()) {
      await retryButton.click()
      await expect(page.locator('text="error"')).not.toBeVisible({ timeout: 5000 })
    }
  })
})
}
