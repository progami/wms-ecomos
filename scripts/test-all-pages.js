const http = require('http');

const pages = [
  // Test pages
  '/test-minimal',
  '/test-basic',
  '/test-client',
  
  // Auth pages
  '/auth/login',
  '/auth/register',
  
  // Main pages
  '/',
  '/dashboard',
  
  // Operations pages
  '/operations/receive',
  '/operations/ship',
  '/operations/inventory',
  '/operations/transactions',
  '/operations/batch-attributes',
  '/operations/shipment-planning',
  
  // Finance pages
  '/finance/reconciliation',
  '/finance/invoices',
  
  // Config pages
  '/config/products',
  '/config/users',
  '/config/channels',
  
  // Admin pages
  '/admin/settings',
  '/admin/users',
  '/admin/invoices',
  
  // Reports
  '/reports',
];

async function testPage(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'text/html',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const hasError = data.includes('Error:') || 
                        data.includes('TypeError:') || 
                        data.includes('ReferenceError:') ||
                        data.includes('SyntaxError:') ||
                        data.includes('Unhandled') ||
                        res.statusCode >= 500;
        
        resolve({
          path,
          status: res.statusCode,
          hasError,
          errorSnippet: hasError ? data.substring(0, 500) : null
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        path,
        status: 0,
        hasError: true,
        errorSnippet: e.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        hasError: true,
        errorSnippet: 'Timeout'
      });
    });

    req.end();
  });
}

async function testAllPages() {
  console.log('Testing all pages for runtime errors...\n');
  
  const results = [];
  
  for (const page of pages) {
    process.stdout.write(`Testing ${page}... `);
    const result = await testPage(page);
    results.push(result);
    
    if (result.hasError) {
      console.log(`❌ ERROR (${result.status})`);
      if (result.errorSnippet) {
        console.log(`  Error: ${result.errorSnippet.split('\n')[0]}`);
      }
    } else {
      console.log(`✅ OK (${result.status})`);
    }
  }
  
  console.log('\n=== Summary ===');
  const errors = results.filter(r => r.hasError);
  console.log(`Total pages tested: ${results.length}`);
  console.log(`Pages with errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nPages with errors:');
    errors.forEach(e => {
      console.log(`- ${e.path}: ${e.errorSnippet?.split('\n')[0] || 'Unknown error'}`);
    });
  }
}

// Wait a moment for server to be ready
setTimeout(() => {
  testAllPages();
}, 2000);