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

async function navigateToAdminSection(page: Page, section: string) {
  await page.click('a[href="/admin"]')
  await page.waitForURL('**/admin')
  if (section) {
    await page.click(`a:has-text("${section}")`)
  }
}

// Test accessibility
async function testAccessibility(page: Page, componentName: string) {
  // Keyboard navigation
  await page.keyboard.press('Tab')
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
  expect(focusedElement).toBeTruthy()
  
  // ARIA labels
  const buttons = await page.locator('button').all()
  for (const button of buttons) {
    const ariaLabel = await button.getAttribute('aria-label')
    const text = await button.textContent()
    expect(ariaLabel || text).toBeTruthy()
  }
}

// Test responsive behavior
async function testResponsiveness(page: Page) {
  // Desktop view
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.waitForTimeout(500)
  
  // Tablet view
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(500)
  
  // Mobile view
  await page.setViewportSize({ width: 375, height: 667 })
  await page.waitForTimeout(500)
  
  // Check if mobile menu appears
  const mobileMenu = await page.locator('[data-testid="mobile-menu"]').isVisible()
  expect(mobileMenu || await page.locator('button:has-text("Menu")').isVisible()).toBeTruthy()
}

test.describe('Admin Module - User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'User Management')
  })

  test('User list displays correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('User Management')
    
    // Check table headers
    await expect(page.locator('th:has-text("Username")')).toBeVisible()
    await expect(page.locator('th:has-text("Email")')).toBeVisible()
    await expect(page.locator('th:has-text("Role")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Created")')).toBeVisible()
    await expect(page.locator('th:has-text("Actions")')).toBeVisible()
    
    // Check for user rows
    const userRows = await page.locator('tbody tr').count()
    expect(userRows).toBeGreaterThan(0)
    
    // Check action buttons
    await expect(page.locator('button:has-text("Add User")')).toBeVisible()
    await expect(page.locator('button:has-text("Export Users")')).toBeVisible()
    await expect(page.locator('input[placeholder*="Search users"]')).toBeVisible()
  })

  test('Search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search users"]')
    
    // Test search by username
    await searchInput.fill('admin')
    await page.waitForTimeout(500)
    const results = await page.locator('tbody tr').count()
    expect(results).toBeGreaterThan(0)
    
    // Test clear search
    await searchInput.clear()
    await page.waitForTimeout(500)
    
    // Test search with no results
    await searchInput.fill('nonexistentuser123')
    await page.waitForTimeout(500)
    await expect(page.locator('text="No users found"')).toBeVisible()
  })

  test('Add new user form', async ({ page }) => {
    await page.click('button:has-text("Add User")')
    
    // Check modal/form appears
    await expect(page.locator('h2:has-text("Add New User")')).toBeVisible()
    
    // Check form fields
    await expect(page.locator('input[name="username"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('select[name="role"]')).toBeVisible()
    await expect(page.locator('input[name="firstName"]')).toBeVisible()
    await expect(page.locator('input[name="lastName"]')).toBeVisible()
    
    // Test validation
    await page.click('button:has-text("Create User")')
    await expect(page.locator('text="Username is required"')).toBeVisible()
    await expect(page.locator('text="Email is required"')).toBeVisible()
    
    // Fill form with valid data
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page.selectOption('select[name="role"]', 'staff')
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')
    
    // Test password mismatch
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!')
    await page.click('button:has-text("Create User")')
    await expect(page.locator('text="Passwords do not match"')).toBeVisible()
    
    // Test cancel button
    await page.click('button:has-text("Cancel")')
    await expect(page.locator('h2:has-text("Add New User")')).not.toBeVisible()
  })

  test('Edit user functionality', async ({ page }) => {
    // Click edit on first user
    await page.click('tbody tr:first-child button:has-text("Edit")')
    
    // Check edit form appears
    await expect(page.locator('h2:has-text("Edit User")')).toBeVisible()
    
    // Check fields are populated
    const usernameField = page.locator('input[name="username"]')
    const emailField = page.locator('input[name="email"]')
    await expect(usernameField).toHaveValue(/.+/)
    await expect(emailField).toHaveValue(/.+/)
    
    // Test field updates
    await emailField.clear()
    await emailField.fill('updated@example.com')
    
    // Test save changes
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="User updated successfully"')).toBeVisible()
  })

  test('User status toggle', async ({ page }) => {
    // Find active user
    const activeUserRow = page.locator('tbody tr:has-text("Active")').first()
    
    // Click deactivate
    await activeUserRow.locator('button:has-text("Deactivate")').click()
    
    // Confirm action
    await expect(page.locator('text="Are you sure"')).toBeVisible()
    await page.click('button:has-text("Confirm")')
    
    // Check status changed
    await expect(page.locator('text="User deactivated successfully"')).toBeVisible()
  })

  test('Delete user with confirmation', async ({ page }) => {
    // Click delete on a non-admin user
    const userRow = page.locator('tbody tr').filter({ hasText: 'staff' }).first()
    await userRow.locator('button:has-text("Delete")').click()
    
    // Check confirmation dialog
    await expect(page.locator('h3:has-text("Confirm Delete")')).toBeVisible()
    await expect(page.locator('text="This action cannot be undone"')).toBeVisible()
    
    // Test cancel
    await page.click('button:has-text("Cancel")')
    await expect(page.locator('h3:has-text("Confirm Delete")')).not.toBeVisible()
    
    // Test actual delete
    await userRow.locator('button:has-text("Delete")').click()
    await page.click('button:has-text("Delete User")')
    await expect(page.locator('text="User deleted successfully"')).toBeVisible()
  })

  test('Bulk actions', async ({ page }) => {
    // Select multiple users
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    
    // Check bulk actions appear
    await expect(page.locator('button:has-text("Bulk Actions")')).toBeVisible()
    await page.click('button:has-text("Bulk Actions")')
    
    // Check dropdown options
    await expect(page.locator('text="Export Selected"')).toBeVisible()
    await expect(page.locator('text="Deactivate Selected"')).toBeVisible()
    await expect(page.locator('text="Delete Selected"')).toBeVisible()
  })

  test('Export users functionality', async ({ page }) => {
    await page.click('button:has-text("Export Users")')
    
    // Check export options
    await expect(page.locator('h3:has-text("Export Users")')).toBeVisible()
    await expect(page.locator('input[value="csv"]')).toBeVisible()
    await expect(page.locator('input[value="xlsx"]')).toBeVisible()
    await expect(page.locator('input[value="json"]')).toBeVisible()
    
    // Select format and export
    await page.click('input[value="csv"]')
    await page.click('button:has-text("Download")')
    
    // Verify download started (check for success message)
    await expect(page.locator('text="Export started"')).toBeVisible()
  })

  test('User permissions management', async ({ page }) => {
    // Click on permissions for a user
    await page.click('tbody tr:first-child button:has-text("Permissions")')
    
    // Check permissions modal
    await expect(page.locator('h2:has-text("User Permissions")')).toBeVisible()
    
    // Check permission categories
    await expect(page.locator('text="Inventory"')).toBeVisible()
    await expect(page.locator('text="Finance"')).toBeVisible()
    await expect(page.locator('text="Reports"')).toBeVisible()
    await expect(page.locator('text="Admin"')).toBeVisible()
    
    // Toggle permissions
    await page.click('input[name="inventory.view"]')
    await page.click('input[name="inventory.edit"]')
    
    // Save permissions
    await page.click('button:has-text("Save Permissions")')
    await expect(page.locator('text="Permissions updated"')).toBeVisible()
  })

  test('Accessibility tests', async ({ page }) => {
    await testAccessibility(page, 'User Management')
    
    // Test table navigation with keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Check screen reader labels
    const table = page.locator('table')
    await expect(table).toHaveAttribute('aria-label', /users|user list/i)
  })

  test('Responsive behavior', async ({ page }) => {
    await testResponsiveness(page)
    
    // Mobile-specific checks
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if table converts to cards on mobile
    const cards = await page.locator('[data-testid="user-card"]').count()
    const table = await page.locator('table').isVisible()
    expect(cards > 0 || table).toBeTruthy()
  })
})

test.describe('Admin Module - System Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Settings')
  })

  test('Settings page displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('System Settings')
    
    // Check settings categories
    await expect(page.locator('text="General Settings"')).toBeVisible()
    await expect(page.locator('text="Security Settings"')).toBeVisible()
    await expect(page.locator('text="Email Configuration"')).toBeVisible()
    await expect(page.locator('text="Warehouse Settings"')).toBeVisible()
    await expect(page.locator('text="Integration Settings"')).toBeVisible()
  })

  test('General settings configuration', async ({ page }) => {
    await page.click('text="General Settings"')
    
    // Check fields
    await expect(page.locator('input[name="companyName"]')).toBeVisible()
    await expect(page.locator('input[name="timezone"]')).toBeVisible()
    await expect(page.locator('select[name="dateFormat"]')).toBeVisible()
    await expect(page.locator('select[name="currency"]')).toBeVisible()
    await expect(page.locator('input[name="logo"]')).toBeVisible()
    
    // Test updating settings
    await page.fill('input[name="companyName"]', 'Test Company')
    await page.selectOption('select[name="timezone"]', 'America/New_York')
    await page.click('button:has-text("Save Changes")')
    
    await expect(page.locator('text="Settings saved successfully"')).toBeVisible()
  })

  test('Security settings', async ({ page }) => {
    await page.click('text="Security Settings"')
    
    // Password policy settings
    await expect(page.locator('input[name="minPasswordLength"]')).toBeVisible()
    await expect(page.locator('input[name="requireUppercase"]')).toBeVisible()
    await expect(page.locator('input[name="requireNumbers"]')).toBeVisible()
    await expect(page.locator('input[name="requireSpecialChars"]')).toBeVisible()
    await expect(page.locator('input[name="passwordExpiry"]')).toBeVisible()
    
    // Session settings
    await expect(page.locator('input[name="sessionTimeout"]')).toBeVisible()
    await expect(page.locator('input[name="maxLoginAttempts"]')).toBeVisible()
    await expect(page.locator('input[name="lockoutDuration"]')).toBeVisible()
    
    // Two-factor authentication
    await expect(page.locator('input[name="enable2FA"]')).toBeVisible()
    await expect(page.locator('select[name="2FAMethod"]')).toBeVisible()
    
    // Test toggling settings
    await page.click('input[name="requireUppercase"]')
    await page.click('input[name="enable2FA"]')
    
    // Check conditional fields appear
    await expect(page.locator('select[name="2FAMethod"]')).toBeEnabled()
  })

  test('Email configuration', async ({ page }) => {
    await page.click('text="Email Configuration"')
    
    // SMTP settings
    await expect(page.locator('input[name="smtpHost"]')).toBeVisible()
    await expect(page.locator('input[name="smtpPort"]')).toBeVisible()
    await expect(page.locator('select[name="smtpSecurity"]')).toBeVisible()
    await expect(page.locator('input[name="smtpUsername"]')).toBeVisible()
    await expect(page.locator('input[name="smtpPassword"]')).toBeVisible()
    
    // Email templates
    await expect(page.locator('button:has-text("Email Templates")')).toBeVisible()
    await page.click('button:has-text("Email Templates")')
    
    // Check template list
    await expect(page.locator('text="Welcome Email"')).toBeVisible()
    await expect(page.locator('text="Password Reset"')).toBeVisible()
    await expect(page.locator('text="Order Confirmation"')).toBeVisible()
    
    // Test connection button
    await page.click('button:has-text("Test Connection")')
    await expect(page.locator('text="Testing connection"')).toBeVisible()
  })

  test('Warehouse settings', async ({ page }) => {
    await page.click('text="Warehouse Settings"')
    
    // Check warehouse list
    await expect(page.locator('h3:has-text("Warehouses")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Warehouse")')).toBeVisible()
    
    // Default settings
    await expect(page.locator('input[name="defaultPickingStrategy"]')).toBeVisible()
    await expect(page.locator('input[name="autoAllocateStock"]')).toBeVisible()
    await expect(page.locator('input[name="enableCrossDocking"]')).toBeVisible()
    
    // Operating hours
    await expect(page.locator('input[name="operatingHoursStart"]')).toBeVisible()
    await expect(page.locator('input[name="operatingHoursEnd"]')).toBeVisible()
    await expect(page.locator('input[name="workingDays"]')).toBeVisible()
  })

  test('Integration settings', async ({ page }) => {
    await page.click('text="Integration Settings"')
    
    // API settings
    await expect(page.locator('h3:has-text("API Configuration")')).toBeVisible()
    await expect(page.locator('button:has-text("Generate API Key")')).toBeVisible()
    await expect(page.locator('text="API Endpoint"')).toBeVisible()
    await expect(page.locator('text="Rate Limits"')).toBeVisible()
    
    // Third-party integrations
    await expect(page.locator('h3:has-text("Third-Party Integrations")')).toBeVisible()
    await expect(page.locator('text="ERP System"')).toBeVisible()
    await expect(page.locator('text="Accounting Software"')).toBeVisible()
    await expect(page.locator('text="Shipping Providers"')).toBeVisible()
    
    // Webhook configuration
    await expect(page.locator('h3:has-text("Webhooks")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Webhook")')).toBeVisible()
  })

  test('Add webhook functionality', async ({ page }) => {
    await page.click('text="Integration Settings"')
    await page.click('button:has-text("Add Webhook")')
    
    // Check webhook form
    await expect(page.locator('h2:has-text("Add Webhook")')).toBeVisible()
    await expect(page.locator('input[name="webhookUrl"]')).toBeVisible()
    await expect(page.locator('select[name="event"]')).toBeVisible()
    await expect(page.locator('input[name="secret"]')).toBeVisible()
    await expect(page.locator('input[name="active"]')).toBeVisible()
    
    // Fill webhook form
    await page.fill('input[name="webhookUrl"]', 'https://example.com/webhook')
    await page.selectOption('select[name="event"]', 'order.created')
    await page.fill('input[name="secret"]', 'webhook-secret-123')
    
    // Test webhook
    await page.click('button:has-text("Test Webhook")')
    await expect(page.locator('text="Test payload sent"')).toBeVisible()
    
    // Save webhook
    await page.click('button:has-text("Save Webhook")')
    await expect(page.locator('text="Webhook added successfully"')).toBeVisible()
  })

  test('Settings search functionality', async ({ page }) => {
    // Check search box
    await expect(page.locator('input[placeholder*="Search settings"]')).toBeVisible()
    
    // Search for specific setting
    await page.fill('input[placeholder*="Search settings"]', 'password')
    await page.waitForTimeout(500)
    
    // Check filtered results
    await expect(page.locator('text="Password Policy")')).toBeVisible()
    await expect(page.locator('text="Email Configuration")')).not.toBeVisible()
    
    // Clear search
    await page.locator('input[placeholder*="Search settings"]').clear()
    await page.waitForTimeout(500)
    
    // All categories should be visible again
    await expect(page.locator('text="General Settings"')).toBeVisible()
    await expect(page.locator('text="Email Configuration"')).toBeVisible()
  })

  test('Import/Export settings', async ({ page }) => {
    // Check import/export buttons
    await expect(page.locator('button:has-text("Export Settings")')).toBeVisible()
    await expect(page.locator('button:has-text("Import Settings")')).toBeVisible()
    
    // Test export
    await page.click('button:has-text("Export Settings")')
    await expect(page.locator('text="Settings exported"')).toBeVisible()
    
    // Test import
    await page.click('button:has-text("Import Settings")')
    await expect(page.locator('h2:has-text("Import Settings")')).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeVisible()
    await expect(page.locator('text="Drag and drop"')).toBeVisible()
  })

  test('Settings validation', async ({ page }) => {
    await page.click('text="General Settings"')
    
    // Test invalid inputs
    await page.fill('input[name="companyName"]', '')
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="Company name is required"')).toBeVisible()
    
    // Test number field validation
    await page.click('text="Security Settings"')
    await page.fill('input[name="minPasswordLength"]', '3')
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="Minimum length must be at least 6"')).toBeVisible()
  })

  test('Settings accessibility', async ({ page }) => {
    await testAccessibility(page, 'System Settings')
    
    // Check form labels
    const inputs = await page.locator('input').all()
    for (const input of inputs.slice(0, 5)) { // Check first 5 inputs
      const label = await input.evaluate((el) => {
        const id = el.id
        return document.querySelector(`label[for="${id}"]`)?.textContent
      })
      expect(label).toBeTruthy()
    }
  })

  test('Settings responsive behavior', async ({ page }) => {
    await testResponsiveness(page)
    
    // Mobile-specific checks
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if settings categories stack vertically
    const firstCategory = await page.locator('text="General Settings"').boundingBox()
    const secondCategory = await page.locator('text="Security Settings"').boundingBox()
    
    if (firstCategory && secondCategory) {
      expect(secondCategory.y).toBeGreaterThan(firstCategory.y)
    }
  })
})

test.describe('Admin Module - Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Audit Logs')
  })

  test('Audit logs page displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Audit Logs')
    
    // Check filters
    await expect(page.locator('input[name="dateFrom"]')).toBeVisible()
    await expect(page.locator('input[name="dateTo"]')).toBeVisible()
    await expect(page.locator('select[name="user"]')).toBeVisible()
    await expect(page.locator('select[name="action"]')).toBeVisible()
    await expect(page.locator('select[name="module"]')).toBeVisible()
    
    // Check table
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible()
    await expect(page.locator('th:has-text("User")')).toBeVisible()
    await expect(page.locator('th:has-text("Action")')).toBeVisible()
    await expect(page.locator('th:has-text("Module")')).toBeVisible()
    await expect(page.locator('th:has-text("Details")')).toBeVisible()
    await expect(page.locator('th:has-text("IP Address")')).toBeVisible()
  })

  test('Filter audit logs', async ({ page }) => {
    // Filter by date
    await page.fill('input[name="dateFrom"]', '2024-01-01')
    await page.fill('input[name="dateTo"]', '2024-12-31')
    await page.click('button:has-text("Apply Filters")')
    
    await page.waitForTimeout(500)
    
    // Filter by user
    await page.selectOption('select[name="user"]', 'demo-admin')
    await page.click('button:has-text("Apply Filters")')
    
    // Filter by action
    await page.selectOption('select[name="action"]', 'login')
    await page.click('button:has-text("Apply Filters")')
    
    // Clear filters
    await page.click('button:has-text("Clear Filters")')
    await expect(page.locator('input[name="dateFrom"]')).toHaveValue('')
  })

  test('View audit log details', async ({ page }) => {
    // Click on a log entry
    await page.click('tbody tr:first-child button:has-text("View")')
    
    // Check detail modal
    await expect(page.locator('h2:has-text("Audit Log Details")')).toBeVisible()
    await expect(page.locator('text="Event ID"')).toBeVisible()
    await expect(page.locator('text="User Agent"')).toBeVisible()
    await expect(page.locator('text="Request Data"')).toBeVisible()
    await expect(page.locator('text="Response Data"')).toBeVisible()
    
    // Close modal
    await page.click('button:has-text("Close")')
    await expect(page.locator('h2:has-text("Audit Log Details")')).not.toBeVisible()
  })

  test('Export audit logs', async ({ page }) => {
    await page.click('button:has-text("Export Logs")')
    
    // Check export options
    await expect(page.locator('h3:has-text("Export Audit Logs")')).toBeVisible()
    await expect(page.locator('text="Export Format"')).toBeVisible()
    await expect(page.locator('input[value="csv"]')).toBeVisible()
    await expect(page.locator('input[value="pdf"]')).toBeVisible()
    await expect(page.locator('input[value="json"]')).toBeVisible()
    
    // Select date range
    await expect(page.locator('text="Date Range"')).toBeVisible()
    await page.click('input[value="last30days"]')
    
    // Export
    await page.click('button:has-text("Export")')
    await expect(page.locator('text="Export started"')).toBeVisible()
  })
})

test.describe('Admin Module - Role Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Roles & Permissions')
  })

  test('Roles list displays correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Roles & Permissions')
    
    // Check default roles
    await expect(page.locator('text="Administrator"')).toBeVisible()
    await expect(page.locator('text="Manager"')).toBeVisible()
    await expect(page.locator('text="Staff"')).toBeVisible()
    await expect(page.locator('text="Viewer"')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Role")')).toBeVisible()
  })

  test('Create new role', async ({ page }) => {
    await page.click('button:has-text("Create Role")')
    
    // Check form
    await expect(page.locator('h2:has-text("Create New Role")')).toBeVisible()
    await expect(page.locator('input[name="roleName"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()
    
    // Check permission checkboxes
    await expect(page.locator('text="Dashboard"')).toBeVisible()
    await expect(page.locator('text="Inventory"')).toBeVisible()
    await expect(page.locator('text="Finance"')).toBeVisible()
    await expect(page.locator('text="Reports"')).toBeVisible()
    
    // Fill form
    await page.fill('input[name="roleName"]', 'Custom Role')
    await page.fill('textarea[name="description"]', 'Custom role for testing')
    
    // Select permissions
    await page.click('input[name="dashboard.view"]')
    await page.click('input[name="inventory.view"]')
    await page.click('input[name="inventory.edit"]')
    
    // Save role
    await page.click('button:has-text("Create Role")')
    await expect(page.locator('text="Role created successfully"')).toBeVisible()
  })

  test('Edit existing role', async ({ page }) => {
    // Click edit on Manager role
    await page.click('tr:has-text("Manager") button:has-text("Edit")')
    
    // Check form populated
    await expect(page.locator('input[name="roleName"]')).toHaveValue('Manager')
    
    // Update permissions
    await page.click('input[name="reports.export"]')
    
    // Save changes
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator('text="Role updated successfully"')).toBeVisible()
  })

  test('Delete role with users check', async ({ page }) => {
    // Try to delete a role with users
    await page.click('tr:has-text("Staff") button:has-text("Delete")')
    
    // Check warning
    await expect(page.locator('text="This role has active users"')).toBeVisible()
    await expect(page.locator('text="Reassign users before deleting"')).toBeVisible()
    
    // Cancel deletion
    await page.click('button:has-text("Cancel")')
  })

  test('Permission matrix view', async ({ page }) => {
    await page.click('button:has-text("Permission Matrix")')
    
    // Check matrix display
    await expect(page.locator('h2:has-text("Permission Matrix")')).toBeVisible()
    
    // Check role columns
    await expect(page.locator('th:has-text("Administrator")')).toBeVisible()
    await expect(page.locator('th:has-text("Manager")')).toBeVisible()
    await expect(page.locator('th:has-text("Staff")')).toBeVisible()
    
    // Check permission rows
    await expect(page.locator('td:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('td:has-text("Inventory")')).toBeVisible()
    
    // Check checkmarks
    const adminColumn = await page.locator('td:has(svg[data-icon="check"])').count()
    expect(adminColumn).toBeGreaterThan(0)
  })
})

test.describe('Admin Module - System Health', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'System Health')
  })

  test('System health dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('System Health')
    
    // Check health indicators
    await expect(page.locator('text="Database"')).toBeVisible()
    await expect(page.locator('text="API Server"')).toBeVisible()
    await expect(page.locator('text="Queue System"')).toBeVisible()
    await expect(page.locator('text="Storage"')).toBeVisible()
    
    // Check metrics
    await expect(page.locator('text="CPU Usage"')).toBeVisible()
    await expect(page.locator('text="Memory Usage"')).toBeVisible()
    await expect(page.locator('text="Disk Space"')).toBeVisible()
    await expect(page.locator('text="Active Users"')).toBeVisible()
  })

  test('Performance metrics', async ({ page }) => {
    await page.click('tab:has-text("Performance")')
    
    // Check charts
    await expect(page.locator('text="Response Time"')).toBeVisible()
    await expect(page.locator('text="Throughput"')).toBeVisible()
    await expect(page.locator('text="Error Rate"')).toBeVisible()
    
    // Check time range selector
    await expect(page.locator('select[name="timeRange"]')).toBeVisible()
    await page.selectOption('select[name="timeRange"]', '24h')
    await page.waitForTimeout(500)
  })

  test('System logs viewer', async ({ page }) => {
    await page.click('tab:has-text("Logs")')
    
    // Check log viewer
    await expect(page.locator('text="Application Logs"')).toBeVisible()
    await expect(page.locator('select[name="logLevel"]')).toBeVisible()
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible()
    await expect(page.locator('button:has-text("Download Logs")')).toBeVisible()
    
    // Filter logs
    await page.selectOption('select[name="logLevel"]', 'error')
    await page.click('button:has-text("Refresh")')
    await page.waitForTimeout(500)
  })

  test('Database maintenance', async ({ page }) => {
    await page.click('tab:has-text("Database")')
    
    // Check database info
    await expect(page.locator('text="Database Size"')).toBeVisible()
    await expect(page.locator('text="Tables"')).toBeVisible()
    await expect(page.locator('text="Indexes"')).toBeVisible()
    
    // Check maintenance actions
    await expect(page.locator('button:has-text("Optimize Tables")')).toBeVisible()
    await expect(page.locator('button:has-text("Backup Database")')).toBeVisible()
    await expect(page.locator('button:has-text("Clear Cache")')).toBeVisible()
  })

  test('Background jobs', async ({ page }) => {
    await page.click('tab:has-text("Jobs")')
    
    // Check job queue
    await expect(page.locator('text="Active Jobs"')).toBeVisible()
    await expect(page.locator('text="Pending Jobs"')).toBeVisible()
    await expect(page.locator('text="Failed Jobs"')).toBeVisible()
    
    // Check job list
    await expect(page.locator('th:has-text("Job ID")')).toBeVisible()
    await expect(page.locator('th:has-text("Type")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Created")')).toBeVisible()
    
    // Retry failed job
    const failedJob = page.locator('tr:has-text("Failed")').first()
    if (await failedJob.isVisible()) {
      await failedJob.locator('button:has-text("Retry")').click()
      await expect(page.locator('text="Job queued for retry"')).toBeVisible()
    }
  })
})

test.describe('Admin Module - Backup & Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Backup & Recovery')
  })

  test('Backup management', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Backup & Recovery')
    
    // Check backup list
    await expect(page.locator('text="Available Backups"')).toBeVisible()
    await expect(page.locator('th:has-text("Backup Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Size")')).toBeVisible()
    await expect(page.locator('th:has-text("Created")')).toBeVisible()
    await expect(page.locator('th:has-text("Type")')).toBeVisible()
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Backup")')).toBeVisible()
    await expect(page.locator('button:has-text("Schedule Backup")')).toBeVisible()
  })

  test('Create manual backup', async ({ page }) => {
    await page.click('button:has-text("Create Backup")')
    
    // Check backup form
    await expect(page.locator('h2:has-text("Create Backup")')).toBeVisible()
    await expect(page.locator('input[name="backupName"]')).toBeVisible()
    await expect(page.locator('select[name="backupType"]')).toBeVisible()
    await expect(page.locator('input[name="includeFiles"]')).toBeVisible()
    await expect(page.locator('input[name="compress"]')).toBeVisible()
    
    // Fill form
    await page.fill('input[name="backupName"]', 'Manual Backup Test')
    await page.selectOption('select[name="backupType"]', 'full')
    await page.click('input[name="includeFiles"]')
    
    // Start backup
    await page.click('button:has-text("Start Backup")')
    await expect(page.locator('text="Backup started"')).toBeVisible()
  })

  test('Schedule automated backup', async ({ page }) => {
    await page.click('button:has-text("Schedule Backup")')
    
    // Check schedule form
    await expect(page.locator('h2:has-text("Schedule Backup")')).toBeVisible()
    await expect(page.locator('select[name="frequency"]')).toBeVisible()
    await expect(page.locator('input[name="time"]')).toBeVisible()
    await expect(page.locator('select[name="dayOfWeek"]')).toBeVisible()
    await expect(page.locator('input[name="retention"]')).toBeVisible()
    
    // Configure schedule
    await page.selectOption('select[name="frequency"]', 'daily')
    await page.fill('input[name="time"]', '02:00')
    await page.fill('input[name="retention"]', '30')
    
    // Save schedule
    await page.click('button:has-text("Save Schedule")')
    await expect(page.locator('text="Backup schedule saved"')).toBeVisible()
  })

  test('Restore from backup', async ({ page }) => {
    // Click restore on a backup
    const backupRow = page.locator('tbody tr').first()
    if (await backupRow.isVisible()) {
      await backupRow.locator('button:has-text("Restore")').click()
      
      // Check confirmation
      await expect(page.locator('h3:has-text("Confirm Restore")')).toBeVisible()
      await expect(page.locator('text="This will overwrite current data"')).toBeVisible()
      
      // Check restore options
      await expect(page.locator('input[name="restoreDatabase"]')).toBeVisible()
      await expect(page.locator('input[name="restoreFiles"]')).toBeVisible()
      await expect(page.locator('input[name="createBackupFirst"]')).toBeVisible()
      
      // Cancel restore
      await page.click('button:has-text("Cancel")')
    }
  })

  test('Download backup', async ({ page }) => {
    const backupRow = page.locator('tbody tr').first()
    if (await backupRow.isVisible()) {
      await backupRow.locator('button:has-text("Download")').click()
      await expect(page.locator('text="Download started"')).toBeVisible()
    }
  })

  test('Delete old backups', async ({ page }) => {
    const oldBackup = page.locator('tbody tr').filter({ hasText: 'days ago' }).first()
    if (await oldBackup.isVisible()) {
      await oldBackup.locator('button:has-text("Delete")').click()
      
      // Confirm deletion
      await expect(page.locator('text="Delete this backup?"')).toBeVisible()
      await page.click('button:has-text("Delete Backup")')
      await expect(page.locator('text="Backup deleted"')).toBeVisible()
    }
  })
})

test.describe('Admin Module - Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToAdminSection(page, 'Notifications')
  })

  test('Notification center', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Notification Center')
    
    // Check tabs
    await expect(page.locator('tab:has-text("All")')).toBeVisible()
    await expect(page.locator('tab:has-text("System")')).toBeVisible()
    await expect(page.locator('tab:has-text("Users")')).toBeVisible()
    await expect(page.locator('tab:has-text("Alerts")')).toBeVisible()
    
    // Check notification list
    await expect(page.locator('[data-testid="notification-item"]')).toBeVisible()
  })

  test('Send broadcast notification', async ({ page }) => {
    await page.click('button:has-text("Send Notification")')
    
    // Check form
    await expect(page.locator('h2:has-text("Send Notification")')).toBeVisible()
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('textarea[name="message"]')).toBeVisible()
    await expect(page.locator('select[name="type"]')).toBeVisible()
    await expect(page.locator('select[name="priority"]')).toBeVisible()
    await expect(page.locator('input[name="recipients"]')).toBeVisible()
    
    // Fill form
    await page.fill('input[name="title"]', 'System Maintenance')
    await page.fill('textarea[name="message"]', 'System will be under maintenance')
    await page.selectOption('select[name="type"]', 'info')
    await page.selectOption('select[name="priority"]', 'high')
    
    // Select recipients
    await page.click('input[value="all-users"]')
    
    // Send notification
    await page.click('button:has-text("Send Now")')
    await expect(page.locator('text="Notification sent"')).toBeVisible()
  })

  test('Notification templates', async ({ page }) => {
    await page.click('button:has-text("Templates")')
    
    // Check template list
    await expect(page.locator('h2:has-text("Notification Templates")')).toBeVisible()
    await expect(page.locator('text="Low Stock Alert"')).toBeVisible()
    await expect(page.locator('text="Order Confirmation"')).toBeVisible()
    await expect(page.locator('text="System Alert"')).toBeVisible()
    
    // Edit template
    await page.click('button:has-text("Edit"):near(:text("Low Stock Alert"))')
    await expect(page.locator('textarea[name="template"]')).toBeVisible()
  })

  test('Mark notifications as read', async ({ page }) => {
    // Select multiple notifications
    await page.click('input[type="checkbox"]:nth-child(1)')
    await page.click('input[type="checkbox"]:nth-child(2)')
    
    // Mark as read
    await page.click('button:has-text("Mark as Read")')
    await expect(page.locator('text="Marked as read"')).toBeVisible()
  })

  test('Delete notifications', async ({ page }) => {
    // Select notifications
    await page.click('input[type="checkbox"]:nth-child(1)')
    
    // Delete
    await page.click('button:has-text("Delete Selected")')
    await page.click('button:has-text("Confirm Delete")')
    await expect(page.locator('text="Deleted successfully"')).toBeVisible()
  })

  test('Notification settings', async ({ page }) => {
    await page.click('button:has-text("Settings")')
    
    // Check settings modal
    await expect(page.locator('h2:has-text("Notification Settings")')).toBeVisible()
    await expect(page.locator('text="Email Notifications"')).toBeVisible()
    await expect(page.locator('text="Push Notifications"')).toBeVisible()
    await expect(page.locator('text="SMS Notifications"')).toBeVisible()
    
    // Configure settings
    await page.click('input[name="emailNotifications"]')
    await page.click('input[name="pushNotifications"]')
    
    // Save settings
    await page.click('button:has-text("Save Settings")')
    await expect(page.locator('text="Settings saved"')).toBeVisible()
  })
})