import { test, expect, Browser, BrowserContext, Page, devices } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Browser configurations for testing
const browserConfigs = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'Mobile Chrome', ...devices['Pixel 5'] },
  { name: 'Mobile Safari', ...devices['iPhone 12'] },
  { name: 'Tablet iPad', ...devices['iPad Pro'] }
];

test.describe('Cross-Browser Compatibility Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const config of browserConfigs) {
    test(`${config.name} - Core functionality`, async ({ browser }) => {
      const context = await browser.newContext(config);
      const page = await context.newPage();

      try {
        // Test login functionality
        await page.goto('/auth/login');
        
        // Check responsive layout
        if (config.isMobile || config.name.includes('Tablet')) {
          // Mobile/Tablet specific checks
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        } else {
          // Desktop specific checks
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        }

        // Test form submission
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for navigation
        await page.waitForURL('/dashboard', { timeout: 10000 });

        // Test JavaScript functionality
        const jsEnabled = await page.evaluate(() => {
          return typeof window !== 'undefined' && window.navigator.userAgent;
        });
        expect(jsEnabled).toBeTruthy();

        // Test local storage
        await page.evaluate(() => {
          localStorage.setItem('test-key', 'test-value');
        });

        const storageValue = await page.evaluate(() => {
          return localStorage.getItem('test-key');
        });
        expect(storageValue).toBe('test-value');

      } finally {
        await context.close();
      }
    });
  }

  test('Browser-specific CSS rendering', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Check for browser-specific CSS issues
    const elements = await page.$$('[data-testid]');
    
    for (const element of elements) {
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        // Element should be visible
        expect(boundingBox.width).toBeGreaterThan(0);
        expect(boundingBox.height).toBeGreaterThan(0);
        
        // Check for overflow issues
        const overflow = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            x: styles.overflowX,
            y: styles.overflowY
          };
        });
        
        // Ensure no unintended overflow
        if (overflow.x === 'hidden' || overflow.y === 'hidden') {
          const scrollDimensions = await element.evaluate((el) => ({
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight
          }));
          
          // Content shouldn't be cut off
          expect(scrollDimensions.scrollWidth).toBeLessThanOrEqual(
            scrollDimensions.clientWidth + 2 // 2px tolerance
          );
        }
      }
    }
  });

  test('Touch gestures on mobile devices', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    const page = await mobileContext.newPage();

    await page.goto('/operations/inventory');

    // Test swipe gestures
    const swipeableElement = page.locator('[data-testid="swipeable-list"]').first();
    
    if (await swipeableElement.count() > 0) {
      const box = await swipeableElement.boundingBox();
      if (box) {
        // Simulate swipe using drag
        await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();

        // Check if swipe action was registered
        await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible();
      }
    }

    // Test pinch-to-zoom on charts
    const chart = page.locator('[data-testid="zoomable-chart"]').first();
    
    if (await chart.count() > 0) {
      const chartBox = await chart.boundingBox();
      if (chartBox) {
        // Simulate zoom using mouse wheel
        await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height / 2);
        await page.mouse.wheel(0, -100); // Zoom in by scrolling up

        // Verify zoom was applied
        const transform = await chart.evaluate((el) => {
          return window.getComputedStyle(el).transform;
        });
        expect(transform).not.toBe('none');
      }
    }

    await mobileContext.close();
  });

  test('Viewport and responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 320, height: 568, name: 'mobile-small' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop-small' },
      { width: 1920, height: 1080, name: 'desktop-large' }
    ];

    for (const viewport of breakpoints) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/dashboard');

      // Check responsive classes
      const bodyClasses = await page.getAttribute('body', 'class');
      
      if (viewport.width < 768) {
        expect(bodyClasses).toContain('mobile');
      } else if (viewport.width < 1024) {
        expect(bodyClasses).toContain('tablet');
      } else {
        expect(bodyClasses).toContain('desktop');
      }

      // Verify layout adjustments
      const sidebar = page.locator('[data-testid="sidebar"]');
      const isSidebarVisible = await sidebar.isVisible();

      if (viewport.width < 768) {
        // Sidebar should be hidden on mobile
        expect(isSidebarVisible).toBe(false);
      } else {
        // Sidebar should be visible on larger screens
        expect(isSidebarVisible).toBe(true);
      }

      // Test grid layouts
      const gridContainer = page.locator('[data-testid="responsive-grid"]').first();
      if (await gridContainer.count() > 0) {
        const gridColumns = await gridContainer.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });

        if (viewport.width < 768) {
          expect(gridColumns).toContain('1fr'); // Single column
        } else if (viewport.width < 1024) {
          expect(gridColumns).toMatch(/repeat\(2/); // 2 columns
        } else {
          expect(gridColumns).toMatch(/repeat\([3-9]/); // 3+ columns
        }
      }
    }
  });

  test('File upload across browsers', async ({ page, browserName }) => {
    await page.goto('/operations/import');

    const fileInput = page.locator('input[type="file"]');
    const testFile = 'tests/edge-cases/fixtures/test-upload.csv';

    // Create test file content
    const csvContent = 'SKU,Name,Quantity\nTEST001,Test Product,100';
    
    // Set file for upload
    await fileInput.setInputFiles({
      name: 'test-upload.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Verify file was selected
    const fileName = await page.locator('[data-testid="selected-file"]').textContent();
    expect(fileName).toContain('test-upload.csv');

    // Test drag and drop (if supported)
    const dropZone = page.locator('[data-testid="drop-zone"]');
    
    if (await dropZone.count() > 0) {
      // Create a data transfer
      await page.evaluate(() => {
        const dropEvent = new DragEvent('drop', {
          dataTransfer: new DataTransfer(),
          bubbles: true,
          cancelable: true
        });

        const file = new File(['test content'], 'test-drag.csv', {
          type: 'text/csv'
        });
        dropEvent.dataTransfer!.items.add(file);

        document.querySelector('[data-testid="drop-zone"]')?.dispatchEvent(dropEvent);
      });

      // Verify drag-drop file was received
      await expect(page.locator('[data-testid="dropped-file"]')).toBeVisible();
    }
  });

  test('Browser storage limits and quota', async ({ page }) => {
    await page.goto('/dashboard');

    // Test IndexedDB storage
    const indexedDBTest = await page.evaluate(async () => {
      try {
        const dbName = 'test-db';
        const request = indexedDB.open(dbName, 1);
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const db = request.result;
            db.close();
            indexedDB.deleteDatabase(dbName);
            resolve({ supported: true });
          };
          
          request.onerror = () => {
            resolve({ supported: false, error: request.error });
          };
        });
      } catch (error) {
        return { supported: false, error };
      }
    });

    expect((indexedDBTest as any).supported).toBe(true);

    // Test storage quota
    const storageEstimate = await page.evaluate(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
        };
      }
      return null;
    });

    if (storageEstimate) {
      expect(storageEstimate.quota).toBeGreaterThan(0);
      expect(storageEstimate.percentage).toBeLessThan(90); // Warn if >90% used
    }
  });

  test('WebSocket compatibility', async ({ page, browserName }) => {
    await page.goto('/dashboard');

    // Test WebSocket support
    const wsTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const ws = new WebSocket('wss://echo.websocket.org');
          
          ws.onopen = () => {
            ws.send('test message');
          };
          
          ws.onmessage = (event) => {
            ws.close();
            resolve({ supported: true, echo: event.data });
          };
          
          ws.onerror = (error) => {
            resolve({ supported: false, error: error.toString() });
          };
          
          setTimeout(() => {
            ws.close();
            resolve({ supported: false, error: 'timeout' });
          }, 5000);
        } catch (error) {
          resolve({ supported: false, error: error.toString() });
        }
      });
    });

    expect((wsTest as any).supported).toBe(true);
    if ((wsTest as any).supported) {
      expect((wsTest as any).echo).toBe('test message');
    }
  });

  test('Print preview functionality', async ({ page }) => {
    await page.goto('/finance/invoices');

    // Navigate to an invoice detail page
    await page.click('[data-testid="invoice-row"]');
    await page.waitForSelector('[data-testid="print-button"]');

    // Test print functionality
    await page.pdf({
      format: 'A4',
      printBackground: true
    });

    // Check print styles
    const printStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules || []);
          } catch {
            return [];
          }
        })
        .filter(rule => rule instanceof CSSMediaRule && rule.media.mediaText.includes('print'));
      
      return styles.length > 0;
    });

    expect(printStyles).toBe(true);
  });

  test('Browser console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate through key pages
    const pages = [
      '/operations/inventory',
      '/operations/warehouse',
      '/finance/invoices',
      '/admin/users'
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && // Ignore favicon 404s
      !error.includes('Development mode') && // Ignore dev warnings
      !error.includes('React DevTools') // Ignore React DevTools messages
    );

    expect(criticalErrors).toHaveLength(0);
  });
});