import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Go to login page
    await page.goto(`${baseURL}/auth/login`)
    
    // Perform login
    await page.fill('input#emailOrUsername', 'admin')
    await page.fill('input#password', 'SecureWarehouse2024!')
    await page.click('button[type="submit"]')
    
    // Wait for navigation
    await page.waitForURL(/\/(admin\/)?dashboard/, { timeout: 10000 })
    
    // Save signed-in state
    await page.context().storageState({ path: 'tests/auth.json' })
    
    console.log('✓ Authentication state saved')
  } catch (error) {
    console.error('✗ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup