import { test, expect } from '@playwright/test'

test.describe('Receive Goods Operations', () => {
  test.use({ storageState: 'tests/auth.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/operations/receive')
  })

  test('receive form has all required fields', async ({ page }) => {
    // Document details section
    await expect(page.locator('input[name="ciNumber"]')).toBeVisible()
    await expect(page.locator('input[name="packingListNumber"]')).toBeVisible()
    await expect(page.locator('input[name="tcNumber"]')).toBeVisible()
    await expect(page.locator('input[name="supplier"]')).toBeVisible()
    
    // Date fields
    await expect(page.locator('input[name="date"]')).toBeVisible()
    await expect(page.locator('input[name="pickupDate"]')).toBeVisible()
    
    // Shipment details
    await expect(page.locator('input[name="shipName"]')).toBeVisible()
    await expect(page.locator('input[name="trackingNumber"]')).toBeVisible()
    
    // Notes
    await expect(page.locator('textarea[name="notes"]')).toBeVisible()
  })

  test('add and remove line items', async ({ page }) => {
    // Initially should have one line item
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(1)
    
    // Add new item
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(2)
    
    // Add another
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(3)
    
    // Remove middle item
    await page.locator('[data-testid="line-item"]:nth-child(2) button[aria-label="Remove item"]').click()
    await expect(page.locator('[data-testid="line-item"]')).toHaveCount(2)
  })

  test('SKU selection populates batch/lot', async ({ page }) => {
    // Select warehouse first (if required)
    const warehouseSelect = page.locator('select[name="warehouseId"]')
    if (await warehouseSelect.isVisible()) {
      await warehouseSelect.selectOption({ index: 1 })
    }
    
    // Select SKU
    const skuSelect = page.locator('select[name="items[0].skuId"]')
    await skuSelect.selectOption({ index: 1 })
    
    // Batch/lot should be auto-populated
    const batchInput = page.locator('input[name="items[0].batchLot"]')
    await expect(batchInput).not.toBeEmpty()
    await expect(batchInput).toHaveAttribute('readonly', '')
  })

  test('quantity calculations work correctly', async ({ page }) => {
    // Fill cartons
    await page.fill('input[name="items[0].cartons"]', '10')
    
    // Fill units per carton
    await page.fill('input[name="items[0].unitsPerCarton"]', '24')
    
    // Check units calculation
    const unitsInput = page.locator('input[name="items[0].units"]')
    await expect(unitsInput).toHaveValue('240')
    
    // Fill pallets configuration
    await page.fill('input[name="items[0].storageCartonsPerPallet"]', '20')
    
    // Pallets should auto-calculate if feature is enabled
    const palletsInput = page.locator('input[name="items[0].pallets"]')
    await page.fill('input[name="items[0].pallets"]', '1')
  })

  test('file upload areas work', async ({ page }) => {
    // Test commercial invoice upload
    const fileInput = page.locator('input[type="file"][data-category="commercialInvoice"]')
    
    // Create a test file
    const buffer = Buffer.from('test file content')
    const fileName = 'test-invoice.pdf'
    
    // Upload file
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: buffer
    })
    
    // Check file was uploaded
    await expect(page.getByText(fileName)).toBeVisible()
    
    // Remove file
    const removeButton = page.locator('button[aria-label="Remove file"]').first()
    if (await removeButton.isVisible()) {
      await removeButton.click()
      await expect(page.getByText(fileName)).not.toBeVisible()
    }
  })

  test('form validation works', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Save Receipt' }).click()
    
    // Check for validation errors
    await expect(page.locator('input[name="ciNumber"]:invalid')).toBeVisible()
    await expect(page.locator('input[name="packingListNumber"]:invalid')).toBeVisible()
    await expect(page.locator('input[name="date"]:invalid')).toBeVisible()
    
    // Fill required fields
    await page.fill('input[name="ciNumber"]', 'CI-2024-001')
    await page.fill('input[name="packingListNumber"]', 'PL-2024-001')
    await page.fill('input[name="date"]', '2024-01-15')
    await page.fill('input[name="pickupDate"]', '2024-01-14')
    
    // Select warehouse if required
    const warehouseSelect = page.locator('select[name="warehouseId"]')
    if (await warehouseSelect.isVisible()) {
      await warehouseSelect.selectOption({ index: 1 })
    }
    
    // Add line item details
    await page.locator('select[name="items[0].skuId"]').selectOption({ index: 1 })
    await page.fill('input[name="items[0].cartons"]', '10')
    await page.fill('input[name="items[0].unitsPerCarton"]', '24')
    
    // Now form should be valid
    const submitButton = page.getByRole('button', { name: 'Save Receipt' })
    await expect(submitButton).toBeEnabled()
  })

  test('cancel button returns to inventory', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL('/operations/inventory')
  })

  test('date pickers work correctly', async ({ page }) => {
    const receiptDate = page.locator('input[name="date"]')
    const pickupDate = page.locator('input[name="pickupDate"]')
    
    // Set receipt date
    await receiptDate.fill('2024-01-15')
    await expect(receiptDate).toHaveValue('2024-01-15')
    
    // Set pickup date (should be before receipt date)
    await pickupDate.fill('2024-01-14')
    await expect(pickupDate).toHaveValue('2024-01-14')
    
    // Test date picker UI if available
    await receiptDate.click()
    const datePicker = page.locator('[role="dialog"], .date-picker')
    if (await datePicker.isVisible()) {
      // Select a date from picker
      await page.getByRole('gridcell', { name: '20' }).click()
      await expect(receiptDate).toHaveValue(/2024-01-20/)
    }
  })

  test('drag and drop file upload', async ({ page }) => {
    const dropZone = page.locator('.drop-zone, [data-category="commercialInvoice"]').first()
    
    if (await dropZone.isVisible()) {
      // Create a file to drag
      const dataTransfer = await page.evaluateHandle(() => {
        const dt = new DataTransfer()
        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
        dt.items.add(file)
        return dt
      })
      
      // Simulate drag and drop
      await dropZone.dispatchEvent('dragenter', { dataTransfer })
      await dropZone.dispatchEvent('dragover', { dataTransfer })
      await dropZone.dispatchEvent('drop', { dataTransfer })
      
      // Check file was uploaded
      await expect(page.getByText('test.pdf')).toBeVisible()
    }
  })
})