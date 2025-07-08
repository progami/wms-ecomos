const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://44.198.217.24:3000/auth/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Take login page screenshot
    await page.screenshot({ path: 'login-page.png' });
    console.log('Login page screenshot saved');
    
    // Fill in login form
    console.log('Filling login form...');
    await page.type('input[name="emailOrUsername"]', 'admin@admin.com', { delay: 50 });
    await page.type('input[name="password"]', 'admin123', { delay: 50 });
    
    // Submit the form
    console.log('Submitting login...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Wait a bit for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take dashboard screenshot
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    await page.screenshot({ path: 'dashboard.png', fullPage: true });
    console.log('Dashboard screenshot saved');
    
    // Try to navigate to specific pages
    const pages = [
      { url: '/dashboard', name: 'dashboard-main' },
      { url: '/inventory', name: 'inventory' },
      { url: '/customers', name: 'customers' },
      { url: '/movements', name: 'movements' }
    ];
    
    for (const pageInfo of pages) {
      try {
        console.log(`Navigating to ${pageInfo.url}...`);
        await page.goto(`http://44.198.217.24:3000${pageInfo.url}`, { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: `${pageInfo.name}.png`, fullPage: true });
        console.log(`${pageInfo.name} screenshot saved`);
      } catch (err) {
        console.log(`Failed to navigate to ${pageInfo.url}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    // Take error screenshot
    await page.screenshot({ path: 'error-state.png' });
  }
  
  await browser.close();
})();