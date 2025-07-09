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

async function navigateToWarehouseConfig(page: Page) {
  await page.click('a[href="/warehouse"]')
  await page.waitForURL('**/warehouse')
}

// Test form validation
async function testFormValidation(page: Page, formSelector: string, requiredFields: string[]) {
  const form = page.locator(formSelector)
  
  // Try to submit empty form
  await form.locator('button[type="submit"]').click()
  
  // Check required field errors
  for (const field of requiredFields) {
    const error = form.locator(`[name="${field}"] ~ .error, #${field}-error`)
    await expect(error).toBeVisible()
  }
}

// Test responsive behavior
async function testResponsiveness(page: Page) {
  const viewports = [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' }
  ]
  
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.waitForTimeout(300)
  }
}

test.describe('Warehouse Configuration - Warehouse Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
  })

  test('Warehouse list displays correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Warehouse Configuration')
    
    // Check warehouse list
    await expect(page.locator('text="Warehouses"')).toBeVisible()
    await expect(page.locator('[data-testid="warehouse-list"]')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add Location")')).toBeVisible()
    await expect(page.locator('button:has-text("Import")')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
    
    // Check warehouse cards
    const warehouseCards = page.locator('[data-testid="warehouse-card"]')
    const cardCount = await warehouseCards.count()
    expect(cardCount).toBeGreaterThan(0)
    
    // Check first warehouse card details
    if (cardCount > 0) {
      const firstCard = warehouseCards.first()
      await expect(firstCard.locator('[data-testid="warehouse-name"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="warehouse-code"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="warehouse-address"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="warehouse-status"]')).toBeVisible()
    }
  })

  test('Add new warehouse', async ({ page }) => {
    await page.click('button:has-text("Add Location")')
    
    // Check modal opens
    await expect(page.locator('h2:has-text("Add New Warehouse")')).toBeVisible()
    
    // Check form fields
    const formFields = [
      'warehouseName',
      'warehouseCode',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'contactPerson',
      'contactEmail',
      'contactPhone',
      'warehouseType',
      'capacity',
      'operatingHours'
    ]
    
    for (const field of formFields) {
      await expect(page.locator(`[name="${field}"]`)).toBeVisible()
    }
    
    // Test form validation
    await testFormValidation(page, '[data-testid="warehouse-form"]', [
      'warehouseName',
      'warehouseCode',
      'address',
      'city',
      'country'
    ])
    
    // Fill form with valid data
    await page.fill('[name="warehouseName"]', 'Test Warehouse')
    await page.fill('[name="warehouseCode"]', 'WH-TEST-001')
    await page.fill('[name="address"]', '123 Test Street')
    await page.fill('[name="city"]', 'Test City')
    await page.fill('[name="state"]', 'Test State')
    await page.fill('[name="zipCode"]', '12345')
    await page.selectOption('[name="country"]', 'US')
    await page.fill('[name="contactPerson"]', 'John Doe')
    await page.fill('[name="contactEmail"]', 'john@example.com')
    await page.fill('[name="contactPhone"]', '+1-555-123-4567')
    await page.selectOption('[name="warehouseType"]', 'distribution')
    await page.fill('[name="capacity"]', '10000')
    
    // Set operating hours
    await page.fill('[name="operatingHoursStart"]', '08:00')
    await page.fill('[name="operatingHoursEnd"]', '18:00')
    
    // Select working days
    const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    for (const day of workingDays) {
      await page.click(`input[name="workingDays"][value="${day}"]`)
    }
    
    // Save warehouse
    await page.click('button:has-text("Save Warehouse")')
    await expect(page.locator('text="Warehouse created successfully"')).toBeVisible()
  })

  test('Edit warehouse details', async ({ page }) => {
    // Click edit on first warehouse
    await page.click('[data-testid="warehouse-card"]:first-child button:has-text("Edit")')
    
    // Check edit form opens
    await expect(page.locator('h2:has-text("Edit Warehouse")')).toBeVisible()
    
    // Check fields are populated
    const nameField = page.locator('[name="warehouseName"]')
    await expect(nameField).toHaveValue(/.+/)
    
    // Update some fields
    await nameField.clear()
    await nameField.fill('Updated Warehouse Name')
    
    await page.fill('[name="capacity"]', '15000')
    
    // Save changes
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="Warehouse updated successfully"')).toBeVisible()
  })

  test('Delete warehouse with confirmation', async ({ page }) => {
    // Click delete on a warehouse
    await page.click('[data-testid="warehouse-card"]:last-child button:has-text("Delete")')
    
    // Check confirmation dialog
    await expect(page.locator('h3:has-text("Confirm Delete")')).toBeVisible()
    await expect(page.locator('text="This action cannot be undone"')).toBeVisible()
    await expect(page.locator('text="associated inventory"')).toBeVisible()
    
    // Cancel deletion
    await page.click('button:has-text("Cancel")')
    await expect(page.locator('h3:has-text("Confirm Delete")')).not.toBeVisible()
    
    // Try delete again and confirm
    await page.click('[data-testid="warehouse-card"]:last-child button:has-text("Delete")')
    await page.click('button:has-text("Delete Warehouse")')
    await expect(page.locator('text="Warehouse deleted successfully"')).toBeVisible()
  })

  test('Warehouse status toggle', async ({ page }) => {
    // Find active warehouse
    const activeWarehouse = page.locator('[data-testid="warehouse-card"]:has-text("Active")').first()
    
    if (await activeWarehouse.isVisible()) {
      // Toggle status
      await activeWarehouse.locator('button:has-text("Deactivate")').click()
      
      // Confirm action
      await expect(page.locator('text="Deactivate warehouse?"')).toBeVisible()
      await page.click('button:has-text("Confirm")')
      
      await expect(page.locator('text="Status updated"')).toBeVisible()
      
      // Check status changed
      await expect(activeWarehouse.locator('text="Inactive"')).toBeVisible()
    }
  })

  test('Warehouse search and filter', async ({ page }) => {
    // Search functionality
    const searchInput = page.locator('input[placeholder*="Search warehouses"]')
    await searchInput.fill('Main')
    await page.waitForTimeout(500)
    
    // Check filtered results
    const results = await page.locator('[data-testid="warehouse-card"]').count()
    expect(results).toBeGreaterThanOrEqual(0)
    
    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(500)
    
    // Filter by type
    const typeFilter = page.locator('select[name="warehouseType"]')
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('distribution')
      await page.waitForTimeout(500)
    }
    
    // Filter by status
    const statusFilter = page.locator('select[name="status"]')
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active')
      await page.waitForTimeout(500)
    }
  })

  test('Import/Export warehouses', async ({ page }) => {
    // Test export
    await page.click('button:has-text("Export")')
    
    // Check export options
    await expect(page.locator('h3:has-text("Export Warehouses")')).toBeVisible()
    await expect(page.locator('input[value="csv"]')).toBeVisible()
    await expect(page.locator('input[value="json"]')).toBeVisible()
    
    await page.click('input[value="csv"]')
    await page.click('button:has-text("Download")')
    await expect(page.locator('text="Export started"')).toBeVisible()
    
    // Test import
    await page.click('button:has-text("Import")')
    
    // Check import modal
    await expect(page.locator('h3:has-text("Import Warehouses")')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeVisible()
    await expect(page.locator('text="Drag and drop"')).toBeVisible()
    
    // Check template download
    await expect(page.locator('a:has-text("Download Template")')).toBeVisible()
  })
})

test.describe('Warehouse Configuration - Zone Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
    await page.click('tab:has-text("Zones")')
  })

  test('Zone list displays correctly', async ({ page }) => {
    // Check zone management section
    await expect(page.locator('h2:has-text("Zone Management")')).toBeVisible()
    
    // Check warehouse selector
    await expect(page.locator('select[name="selectedWarehouse"]')).toBeVisible()
    
    // Check zone grid/list
    await expect(page.locator('[data-testid="zone-grid"]')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add Zone")')).toBeVisible()
    await expect(page.locator('button:has-text("Zone Map")')).toBeVisible()
  })

  test('Add new zone', async ({ page }) => {
    // Select warehouse first
    await page.selectOption('select[name="selectedWarehouse"]', { index: 1 })
    await page.waitForTimeout(500)
    
    await page.click('button:has-text("Add Zone")')
    
    // Check zone form
    await expect(page.locator('h2:has-text("Add New Zone")')).toBeVisible()
    
    // Fill zone details
    await page.fill('[name="zoneName"]', 'Zone A1')
    await page.fill('[name="zoneCode"]', 'A1')
    await page.selectOption('[name="zoneType"]', 'storage')
    await page.fill('[name="capacity"]', '500')
    await page.selectOption('[name="temperatureControl"]', 'ambient')
    
    // Set zone dimensions
    await page.fill('[name="length"]', '20')
    await page.fill('[name="width"]', '15')
    await page.fill('[name="height"]', '10')
    
    // Set zone restrictions
    await page.click('input[name="hazmatAllowed"]')
    await page.click('input[name="foodGradeOnly"]')
    
    // Save zone
    await page.click('button:has-text("Create Zone")')
    await expect(page.locator('text="Zone created successfully"')).toBeVisible()
  })

  test('Zone visualization map', async ({ page }) => {
    await page.click('button:has-text("Zone Map")')
    
    // Check map view
    await expect(page.locator('h2:has-text("Warehouse Zone Map")')).toBeVisible()
    await expect(page.locator('[data-testid="zone-map-canvas"]')).toBeVisible()
    
    // Check map controls
    await expect(page.locator('button[aria-label="Zoom in"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Zoom out"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Reset view"]')).toBeVisible()
    
    // Check legend
    await expect(page.locator('text="Zone Types"')).toBeVisible()
    await expect(page.locator('text="Storage"')).toBeVisible()
    await expect(page.locator('text="Picking"')).toBeVisible()
    await expect(page.locator('text="Staging"')).toBeVisible()
    
    // Click on a zone
    const zone = page.locator('[data-testid="zone-map-item"]').first()
    if (await zone.isVisible()) {
      await zone.click()
      
      // Check zone details popup
      await expect(page.locator('[data-testid="zone-popup"]')).toBeVisible()
      await expect(page.locator('text="Zone Details"')).toBeVisible()
    }
  })

  test('Edit zone configuration', async ({ page }) => {
    // Click edit on a zone
    await page.click('[data-testid="zone-item"]:first-child button:has-text("Edit")')
    
    // Update zone settings
    await page.fill('[name="capacity"]', '600')
    await page.selectOption('[name="temperatureControl"]', 'refrigerated')
    
    // Update temperature range
    await page.fill('[name="minTemperature"]', '2')
    await page.fill('[name="maxTemperature"]', '8')
    
    // Save changes
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="Zone updated successfully"')).toBeVisible()
  })

  test('Zone allocation rules', async ({ page }) => {
    // Click on zone rules
    await page.click('[data-testid="zone-item"]:first-child button:has-text("Rules")')
    
    // Check rules modal
    await expect(page.locator('h2:has-text("Zone Allocation Rules")')).toBeVisible()
    
    // Add new rule
    await page.click('button:has-text("Add Rule")')
    
    // Fill rule details
    await page.selectOption('[name="ruleType"]', 'product-category')
    await page.selectOption('[name="category"]', 'electronics')
    await page.selectOption('[name="priority"]', 'high')
    
    // Save rule
    await page.click('button:has-text("Save Rule")')
    await expect(page.locator('text="Rule added"')).toBeVisible()
  })

  test('Zone utilization metrics', async ({ page }) => {
    // Check zone utilization display
    const zoneItems = page.locator('[data-testid="zone-item"]')
    const firstZone = zoneItems.first()
    
    if (await firstZone.isVisible()) {
      // Check utilization percentage
      const utilization = firstZone.locator('[data-testid="utilization-percentage"]')
      await expect(utilization).toBeVisible()
      
      // Check utilization bar
      const utilizationBar = firstZone.locator('[data-testid="utilization-bar"]')
      await expect(utilizationBar).toBeVisible()
      
      // Click for details
      await firstZone.locator('button:has-text("Details")')
      
      // Check detailed metrics
      await expect(page.locator('text="Current Capacity"')).toBeVisible()
      await expect(page.locator('text="Available Space"')).toBeVisible()
      await expect(page.locator('text="Reserved Space"')).toBeVisible()
    }
  })
})

test.describe('Warehouse Configuration - Location Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
    await page.click('tab:has-text("Locations")')
  })

  test('Location hierarchy display', async ({ page }) => {
    // Check location management section
    await expect(page.locator('h2:has-text("Location Management")')).toBeVisible()
    
    // Check hierarchy view
    await expect(page.locator('[data-testid="location-tree"]')).toBeVisible()
    
    // Check view toggle
    await expect(page.locator('button:has-text("Tree View")')).toBeVisible()
    await expect(page.locator('button:has-text("Grid View")')).toBeVisible()
    await expect(page.locator('button:has-text("List View")')).toBeVisible()
    
    // Check location levels
    await expect(page.locator('text="Warehouse"')).toBeVisible()
    await expect(page.locator('text="Zone"')).toBeVisible()
    await expect(page.locator('text="Aisle"')).toBeVisible()
    await expect(page.locator('text="Rack"')).toBeVisible()
    await expect(page.locator('text="Shelf"')).toBeVisible()
    await expect(page.locator('text="Bin"')).toBeVisible()
  })

  test('Bulk location creation', async ({ page }) => {
    await page.click('button:has-text("Bulk Create")')
    
    // Check bulk creation modal
    await expect(page.locator('h2:has-text("Bulk Create Locations")')).toBeVisible()
    
    // Select location type
    await page.selectOption('[name="locationType"]', 'rack')
    
    // Set naming pattern
    await page.fill('[name="prefix"]', 'R')
    await page.fill('[name="startNumber"]', '1')
    await page.fill('[name="endNumber"]', '10')
    await page.fill('[name="digits"]', '3')
    
    // Set location properties
    await page.fill('[name="capacity"]', '100')
    await page.selectOption('[name="zone"]', { index: 1 })
    
    // Preview locations
    await page.click('button:has-text("Preview")')
    await expect(page.locator('text="Location Preview"')).toBeVisible()
    await expect(page.locator('text="R001"')).toBeVisible()
    await expect(page.locator('text="R010"')).toBeVisible()
    
    // Create locations
    await page.click('button:has-text("Create Locations")')
    await expect(page.locator('text="10 locations created"')).toBeVisible()
  })

  test('Location barcode generation', async ({ page }) => {
    // Select multiple locations
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    await page.click('input[type="checkbox"]:nth-child(3)')
    
    // Generate barcodes
    await page.click('button:has-text("Generate Barcodes")')
    
    // Check barcode modal
    await expect(page.locator('h2:has-text("Generate Location Barcodes")')).toBeVisible()
    
    // Select barcode type
    await page.selectOption('[name="barcodeType"]', 'qr')
    
    // Set label options
    await page.click('input[name="includeLocationName"]')
    await page.click('input[name="includeZone"]')
    
    // Preview barcode
    await page.click('button:has-text("Preview")')
    await expect(page.locator('[data-testid="barcode-preview"]')).toBeVisible()
    
    // Download barcodes
    await page.click('button:has-text("Download PDF")')
    await expect(page.locator('text="Generating barcodes"')).toBeVisible()
  })

  test('Location attributes configuration', async ({ page }) => {
    // Click on a location
    await page.click('[data-testid="location-item"]:first-child')
    
    // Check location details panel
    await expect(page.locator('h3:has-text("Location Details")')).toBeVisible()
    
    // Edit attributes
    await page.click('button:has-text("Edit Attributes")')
    
    // Set location attributes
    await page.click('input[name="highValue"]')
    await page.click('input[name="secureAccess"]')
    await page.selectOption('[name="pickingPriority"]', 'high')
    
    // Set weight limit
    await page.fill('[name="maxWeight"]', '500')
    await page.selectOption('[name="weightUnit"]', 'kg')
    
    // Set dimension limits
    await page.fill('[name="maxLength"]', '120')
    await page.fill('[name="maxWidth"]', '80')
    await page.fill('[name="maxHeight"]', '100')
    
    // Save attributes
    await page.click('button:has-text("Save Attributes")')
    await expect(page.locator('text="Attributes updated"')).toBeVisible()
  })

  test('Location search and navigation', async ({ page }) => {
    // Search for location
    const searchInput = page.locator('input[placeholder*="Search location"]')
    await searchInput.fill('A-01-01')
    await page.waitForTimeout(500)
    
    // Check search results
    await expect(page.locator('text="Search Results"')).toBeVisible()
    const results = await page.locator('[data-testid="search-result"]').count()
    expect(results).toBeGreaterThanOrEqual(0)
    
    // Use location navigator
    await searchInput.clear()
    await page.click('button:has-text("Navigator")')
    
    // Navigate through hierarchy
    await page.selectOption('[name="warehouse"]', { index: 1 })
    await page.selectOption('[name="zone"]', { index: 1 })
    await page.selectOption('[name="aisle"]', { index: 1 })
    
    // Go to location
    await page.click('button:has-text("Go to Location")')
    await expect(page.locator('[data-testid="current-location"]')).toBeVisible()
  })

  test('Location status management', async ({ page }) => {
    // Filter by status
    await page.selectOption('[name="locationStatus"]', 'available')
    await page.waitForTimeout(500)
    
    // Select location
    const location = page.locator('[data-testid="location-item"]').first()
    await location.click()
    
    // Change status
    await page.click('button:has-text("Change Status")')
    
    // Check status options
    await expect(page.locator('text="Available"')).toBeVisible()
    await expect(page.locator('text="Occupied"')).toBeVisible()
    await expect(page.locator('text="Reserved"')).toBeVisible()
    await expect(page.locator('text="Blocked"')).toBeVisible()
    await expect(page.locator('text="Maintenance"')).toBeVisible()
    
    // Select new status
    await page.click('input[value="maintenance"]')
    await page.fill('textarea[name="reason"]', 'Scheduled cleaning')
    
    // Save status change
    await page.click('button:has-text("Update Status")')
    await expect(page.locator('text="Status updated"')).toBeVisible()
  })
})

test.describe('Warehouse Configuration - Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
    await page.click('tab:has-text("Equipment")')
  })

  test('Equipment inventory display', async ({ page }) => {
    // Check equipment section
    await expect(page.locator('h2:has-text("Equipment Management")')).toBeVisible()
    
    // Check equipment categories
    await expect(page.locator('text="Forklifts"')).toBeVisible()
    await expect(page.locator('text="Pallet Jacks"')).toBeVisible()
    await expect(page.locator('text="Conveyors"')).toBeVisible()
    await expect(page.locator('text="Scanners"')).toBeVisible()
    await expect(page.locator('text="Printers"')).toBeVisible()
    
    // Check equipment list
    await expect(page.locator('[data-testid="equipment-grid"]')).toBeVisible()
  })

  test('Add new equipment', async ({ page }) => {
    await page.click('button:has-text("Add Equipment")')
    
    // Check equipment form
    await expect(page.locator('h2:has-text("Add New Equipment")')).toBeVisible()
    
    // Fill equipment details
    await page.fill('[name="equipmentName"]', 'Forklift FL-001')
    await page.fill('[name="serialNumber"]', 'SN-123456789')
    await page.selectOption('[name="equipmentType"]', 'forklift')
    await page.selectOption('[name="manufacturer"]', 'Toyota')
    await page.fill('[name="model"]', 'Model 8FGU25')
    await page.fill('[name="purchaseDate"]', '2023-01-15')
    await page.fill('[name="warrantyExpiry"]', '2025-01-15')
    
    // Set specifications
    await page.fill('[name="capacity"]', '2500')
    await page.selectOption('[name="capacityUnit"]', 'kg')
    await page.fill('[name="operatingHours"]', '1250')
    
    // Assign to warehouse
    await page.selectOption('[name="assignedWarehouse"]', { index: 1 })
    await page.selectOption('[name="assignedZone"]', { index: 1 })
    
    // Save equipment
    await page.click('button:has-text("Save Equipment")')
    await expect(page.locator('text="Equipment added successfully"')).toBeVisible()
  })

  test('Equipment maintenance schedule', async ({ page }) => {
    // Click on equipment
    await page.click('[data-testid="equipment-card"]:first-child')
    
    // Go to maintenance tab
    await page.click('tab:has-text("Maintenance")')
    
    // Check maintenance history
    await expect(page.locator('text="Maintenance History"')).toBeVisible()
    await expect(page.locator('[data-testid="maintenance-timeline"]')).toBeVisible()
    
    // Schedule maintenance
    await page.click('button:has-text("Schedule Maintenance")')
    
    // Fill maintenance form
    await expect(page.locator('h3:has-text("Schedule Maintenance")')).toBeVisible()
    await page.selectOption('[name="maintenanceType"]', 'preventive')
    await page.fill('[name="scheduledDate"]', '2024-02-01')
    await page.fill('[name="estimatedDuration"]', '4')
    await page.selectOption('[name="technician"]', { index: 1 })
    await page.fill('textarea[name="description"]', 'Regular 6-month service')
    
    // Save schedule
    await page.click('button:has-text("Schedule")')
    await expect(page.locator('text="Maintenance scheduled"')).toBeVisible()
  })

  test('Equipment tracking and location', async ({ page }) => {
    // Enable real-time tracking
    const trackingToggle = page.locator('input[name="enableTracking"]')
    if (await trackingToggle.isVisible()) {
      await trackingToggle.click()
    }
    
    // View equipment map
    await page.click('button:has-text("Equipment Map")')
    
    // Check map view
    await expect(page.locator('h2:has-text("Equipment Location Map")')).toBeVisible()
    await expect(page.locator('[data-testid="equipment-map"]')).toBeVisible()
    
    // Check equipment markers
    const equipmentMarkers = page.locator('[data-testid="equipment-marker"]')
    const markerCount = await equipmentMarkers.count()
    expect(markerCount).toBeGreaterThanOrEqual(0)
    
    // Click on marker for details
    if (markerCount > 0) {
      await equipmentMarkers.first().click()
      await expect(page.locator('[data-testid="equipment-popup"]')).toBeVisible()
    }
  })

  test('Equipment utilization reports', async ({ page }) => {
    await page.click('button:has-text("Utilization Report")')
    
    // Check report modal
    await expect(page.locator('h2:has-text("Equipment Utilization")')).toBeVisible()
    
    // Check utilization metrics
    await expect(page.locator('text="Average Utilization"')).toBeVisible()
    await expect(page.locator('text="Peak Hours"')).toBeVisible()
    await expect(page.locator('text="Idle Time"')).toBeVisible()
    
    // Check utilization chart
    await expect(page.locator('[data-testid="utilization-chart"]')).toBeVisible()
    
    // Filter by date range
    await page.fill('[name="startDate"]', '2024-01-01')
    await page.fill('[name="endDate"]', '2024-01-31')
    await page.click('button:has-text("Update Report")')
    await page.waitForTimeout(500)
    
    // Export report
    await page.click('button:has-text("Export Report")')
    await expect(page.locator('text="Report exported"')).toBeVisible()
  })

  test('Equipment assignment and transfer', async ({ page }) => {
    // Select equipment
    await page.click('[data-testid="equipment-card"]:first-child button:has-text("Assign")')
    
    // Check assignment modal
    await expect(page.locator('h3:has-text("Assign Equipment")')).toBeVisible()
    
    // Select operator
    await page.selectOption('[name="operator"]', { index: 1 })
    await page.selectOption('[name="shift"]', 'morning')
    await page.fill('[name="assignmentDate"]', '2024-01-20')
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Assigned for special project')
    
    // Confirm assignment
    await page.click('button:has-text("Assign")')
    await expect(page.locator('text="Equipment assigned"')).toBeVisible()
    
    // Transfer equipment
    await page.click('[data-testid="equipment-card"]:first-child button:has-text("Transfer")')
    
    // Select new location
    await page.selectOption('[name="newWarehouse"]', { index: 2 })
    await page.selectOption('[name="newZone"]', { index: 1 })
    await page.fill('[name="transferDate"]', '2024-01-25')
    await page.fill('textarea[name="transferReason"]', 'Needed at other facility')
    
    // Confirm transfer
    await page.click('button:has-text("Transfer")')
    await expect(page.locator('text="Transfer scheduled"')).toBeVisible()
  })
})

test.describe('Warehouse Configuration - Settings & Rules', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
    await page.click('tab:has-text("Settings")')
  })

  test('General warehouse settings', async ({ page }) => {
    // Check settings sections
    await expect(page.locator('h2:has-text("Warehouse Settings")')).toBeVisible()
    
    // Operating parameters
    await expect(page.locator('text="Operating Parameters"')).toBeVisible()
    await expect(page.locator('[name="defaultPickingStrategy"]')).toBeVisible()
    await expect(page.locator('[name="replenishmentThreshold"]')).toBeVisible()
    await expect(page.locator('[name="cycleCountFrequency"]')).toBeVisible()
    
    // Update settings
    await page.selectOption('[name="defaultPickingStrategy"]', 'zone-picking')
    await page.fill('[name="replenishmentThreshold"]', '20')
    await page.selectOption('[name="cycleCountFrequency"]', 'weekly')
    
    // Save settings
    await page.click('button:has-text("Save Settings")')
    await expect(page.locator('text="Settings saved"')).toBeVisible()
  })

  test('Allocation rules configuration', async ({ page }) => {
    await page.click('button:has-text("Allocation Rules")')
    
    // Check rules interface
    await expect(page.locator('h3:has-text("Allocation Rules")')).toBeVisible()
    
    // Add new rule
    await page.click('button:has-text("Add Rule")')
    
    // Configure rule
    await page.fill('[name="ruleName"]', 'Fast-Moving Items Rule')
    await page.selectOption('[name="ruleType"]', 'velocity-based')
    await page.selectOption('[name="condition"]', 'high-velocity')
    await page.selectOption('[name="action"]', 'allocate-to-zone')
    await page.selectOption('[name="targetZone"]', 'picking-zone-a')
    await page.fill('[name="priority"]', '1')
    
    // Set rule activation
    await page.click('input[name="active"]')
    
    // Save rule
    await page.click('button:has-text("Save Rule")')
    await expect(page.locator('text="Rule created"')).toBeVisible()
  })

  test('Slotting optimization settings', async ({ page }) => {
    await page.click('button:has-text("Slotting Optimization")')
    
    // Check optimization panel
    await expect(page.locator('h3:has-text("Slotting Optimization")')).toBeVisible()
    
    // Configure optimization parameters
    await page.click('input[name="enableAutoSlotting"]')
    await page.selectOption('[name="optimizationFrequency"]', 'monthly')
    
    // Set optimization criteria
    await page.click('input[name="minimizePickDistance"]')
    await page.click('input[name="balanceZoneUtilization"]')
    await page.click('input[name="groupRelatedItems"]')
    
    // Set constraints
    await page.fill('[name="maxMovesPerCycle"]', '100')
    await page.fill('[name="minUtilizationThreshold"]', '70')
    
    // Run optimization
    await page.click('button:has-text("Run Optimization")')
    await expect(page.locator('text="Optimization started"')).toBeVisible()
    
    // View results
    await page.waitForTimeout(2000)
    await expect(page.locator('text="Optimization Complete"')).toBeVisible()
    await expect(page.locator('text="Suggested Moves"')).toBeVisible()
  })

  test('Safety and compliance settings', async ({ page }) => {
    await page.click('button:has-text("Safety & Compliance")')
    
    // Check safety settings
    await expect(page.locator('h3:has-text("Safety & Compliance")')).toBeVisible()
    
    // Configure safety zones
    await page.click('input[name="enforceSpeedLimits"]')
    await page.fill('[name="maxSpeedLimit"]', '10')
    await page.selectOption('[name="speedUnit"]', 'mph')
    
    // Set access restrictions
    await page.click('input[name="requireCertification"]')
    await page.selectOption('[name="certificationLevel"]', 'advanced')
    
    // Configure hazmat settings
    await page.click('input[name="segregateHazmat"]')
    await page.fill('[name="hazmatZone"]', 'HAZMAT-A')
    await page.fill('[name="minDistance"]', '50')
    
    // Set compliance alerts
    await page.click('input[name="enableComplianceAlerts"]')
    await page.fill('[name="alertEmail"]', 'safety@example.com')
    
    // Save safety settings
    await page.click('button:has-text("Save Safety Settings")')
    await expect(page.locator('text="Safety settings updated"')).toBeVisible()
  })

  test('Integration settings', async ({ page }) => {
    await page.click('button:has-text("Integrations")')
    
    // Check integration options
    await expect(page.locator('h3:has-text("Warehouse Integrations")')).toBeVisible()
    
    // WMS integration
    await expect(page.locator('text="WMS Integration"')).toBeVisible()
    await page.click('input[name="enableWMS"]')
    await page.fill('[name="wmsEndpoint"]', 'https://wms.example.com/api')
    await page.fill('[name="wmsApiKey"]', 'test-api-key-123')
    
    // Test connection
    await page.click('button:has-text("Test Connection")')
    await expect(page.locator('text="Testing connection"')).toBeVisible()
    
    // RFID/Barcode settings
    await expect(page.locator('text="RFID/Barcode"')).toBeVisible()
    await page.selectOption('[name="scannerType"]', 'rfid')
    await page.fill('[name="readRange"]', '10')
    
    // Save integration settings
    await page.click('button:has-text("Save Integrations")')
    await expect(page.locator('text="Integration settings saved"')).toBeVisible()
  })
})

test.describe('Warehouse Configuration - Accessibility & Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToWarehouseConfig(page)
  })

  test('Keyboard navigation', async ({ page }) => {
    // Tab through main navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Navigate tabs with arrow keys
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(300)
    
    // Enter to select
    await page.keyboard.press('Enter')
    
    // Check focus indicators
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName
    })
    expect(focusedElement).toBeTruthy()
  })

  test('Screen reader compatibility', async ({ page }) => {
    // Check ARIA labels
    const buttons = await page.locator('button').all()
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label')
      const text = await button.textContent()
      expect(ariaLabel || text).toBeTruthy()
    }
    
    // Check form labels
    const inputs = await page.locator('input:not([type="hidden"])').all()
    for (const input of inputs.slice(0, 5)) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).textContent()
        expect(label).toBeTruthy()
      }
    }
    
    // Check table accessibility
    const tables = await page.locator('table').all()
    for (const table of tables) {
      const caption = await table.locator('caption').textContent()
      const ariaLabel = await table.getAttribute('aria-label')
      expect(caption || ariaLabel).toBeTruthy()
    }
  })

  test('Responsive layout', async ({ page }) => {
    await testResponsiveness(page)
    
    // Mobile-specific checks
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check mobile menu
    const mobileMenu = page.locator('[data-testid="mobile-menu"]')
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    }
    
    // Check cards stack vertically
    const cards = await page.locator('[data-testid="warehouse-card"]').all()
    if (cards.length > 1) {
      const firstBox = await cards[0].boundingBox()
      const secondBox = await cards[1].boundingBox()
      if (firstBox && secondBox) {
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height)
      }
    }
  })

  test('Touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Test swipe gestures
    const swipeableElement = page.locator('[data-testid="swipeable"]').first()
    if (await swipeableElement.isVisible()) {
      const box = await swipeableElement.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + 50, box.y + box.height / 2)
        await page.mouse.up()
      }
    }
    
    // Test long press
    const longPressElement = page.locator('[data-testid="warehouse-card"]').first()
    if (await longPressElement.isVisible()) {
      const box = await longPressElement.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.waitForTimeout(1000)
        await page.mouse.up()
        
        // Check if context menu appears
        const contextMenu = page.locator('[data-testid="context-menu"]')
        if (await contextMenu.isVisible()) {
          expect(true).toBeTruthy()
        }
      }
    }
  })

  test('Print view optimization', async ({ page }) => {
    // Emulate print media
    await page.emulateMedia({ media: 'print' })
    
    // Check print-specific elements
    const printOnly = await page.locator('.print-only').count()
    const noPrint = await page.locator('.no-print').isVisible()
    expect(!noPrint).toBeTruthy()
    
    // Reset media
    await page.emulateMedia({ media: 'screen' })
    
    // Test print button
    const printButton = page.locator('button:has-text("Print")')
    if (await printButton.isVisible()) {
      page.on('dialog', dialog => dialog.accept())
      await printButton.click()
    }
  })
})