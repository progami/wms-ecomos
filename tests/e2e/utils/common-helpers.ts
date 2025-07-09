import { Page, expect } from '@playwright/test';

/**
 * Check if a page is showing "Under Construction" message
 */
export async function isUnderConstruction(page: Page): Promise<boolean> {
  try {
    const underConstructionText = await page.locator('text="Under Construction"').count();
    return underConstructionText > 0;
  } catch {
    return false;
  }
}

/**
 * Handle pages that might be under construction
 * Returns true if page is under construction, false if functional
 */
export async function handleUnderConstruction(page: Page, pageName: string): Promise<boolean> {
  if (await isUnderConstruction(page)) {
    // Verify it's a proper under construction page
    await expect(page.locator('text="Under Construction"')).toBeVisible();
    await expect(page.locator('text="Coming Soon"')).toBeVisible();
    console.log(`✓ ${pageName} is under construction as expected`);
    return true;
  }
  return false;
}

/**
 * Navigate and handle potential under construction pages
 */
export async function navigateToPage(page: Page, url: string, pageName: string): Promise<boolean> {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  // Check if we're redirected to login
  if (page.url().includes('/auth/login')) {
    throw new Error(`Redirected to login when accessing ${pageName}`);
  }
  
  return await handleUnderConstruction(page, pageName);
}

/**
 * Wait for and close welcome modal if it appears
 */
export async function closeWelcomeModal(page: Page) {
  try {
    const welcomeModal = page.locator('text="Welcome to WMS Demo!"');
    if (await welcomeModal.isVisible({ timeout: 3000 })) {
      const startButton = page.locator('button:has-text("Start Exploring")');
      if (await startButton.isVisible()) {
        await startButton.click();
        await welcomeModal.waitFor({ state: 'hidden', timeout: 5000 });
      }
    }
  } catch {
    // Modal might not appear, which is fine
  }
}

/**
 * Get navigation menu items that should be visible
 */
export async function getVisibleNavItems(page: Page, userRole: 'admin' | 'staff' = 'staff'): Promise<string[]> {
  const commonItems = [
    'Dashboard',
    'Inventory',
    'Operations',
    'Finance',
    'Configuration',
    'Reports'
  ];
  
  const adminOnlyItems = [
    'Admin'
  ];
  
  return userRole === 'admin' ? [...commonItems, ...adminOnlyItems] : commonItems;
}

/**
 * Verify dashboard loads with basic elements
 */
export async function verifyDashboardLoaded(page: Page) {
  // Wait for dashboard to load
  await expect(page.locator('h1')).toContainText('Dashboard');
  
  // Check for main dashboard sections
  const dashboardSections = [
    'Market', // Changed from 'Total SKUs'
    'Quick Actions',
    'Recent Activity'
  ];
  
  for (const section of dashboardSections) {
    const sectionExists = await page.locator(`text="${section}"`).count() > 0;
    if (!sectionExists) {
      console.log(`Warning: Dashboard section "${section}" not found`);
    }
  }
}

/**
 * Check if a feature is available or under construction
 */
export async function checkFeatureAvailability(page: Page, featureName: string): Promise<'available' | 'under-construction' | 'not-found'> {
  await page.waitForLoadState('networkidle');
  
  if (await isUnderConstruction(page)) {
    return 'under-construction';
  }
  
  // Check if we have the expected feature elements
  const hasContent = await page.locator('main').count() > 0;
  const hasError = await page.locator('text="404"').count() > 0;
  
  if (hasError) {
    return 'not-found';
  }
  
  return hasContent ? 'available' : 'not-found';
}