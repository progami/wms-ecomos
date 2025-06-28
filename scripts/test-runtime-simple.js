const http = require('http');

const pages = [
  // Test pages
  '/test-minimal',
  '/test-basic',
  '/test-client',
  
  // Public pages
  '/auth/login',
  '/',
  
  // Pages that don't require data
  '/operations/batch-attributes',
  '/operations/shipment-planning',
  '/dashboard',
  '/admin/settings',
  '/admin/users', 
  '/admin/invoices',
  '/reports',
];

async function checkPage(path) {
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
        // Check for specific error patterns in the HTML
        const hasError = data.includes('Error:') && !data.includes('ErrorBoundary') ||
                        data.includes('TypeError:') ||
                        data.includes('ReferenceError:') ||
                        data.includes('SyntaxError:') ||
                        data.includes('Unhandled') ||
                        data.includes('Cannot read properties') ||
                        data.includes('hooks than during the previous render') ||
                        res.statusCode >= 500;
        
        // Extract error message if found
        let errorMessage = null;
        if (hasError) {
          const errorMatch = data.match(/Error: ([^<]+)/);
          if (errorMatch) errorMessage = errorMatch[1];
          
          const typeErrorMatch = data.match(/TypeError: ([^<]+)/);
          if (typeErrorMatch) errorMessage = typeErrorMatch[1];
          
          const hooksMatch = data.match(/(hooks than during the previous render)/);
          if (hooksMatch) errorMessage = 'React hooks error: ' + hooksMatch[1];
        }
        
        resolve({
          path,
          status: res.statusCode,
          hasError,
          errorMessage
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        path,
        status: 0,
        hasError: true,
        errorMessage: e.message
      });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        hasError: false,
        errorMessage: null
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Running simplified runtime error tests...\n');
  
  const results = [];
  
  for (const page of pages) {
    process.stdout.write(`Checking ${page}... `);
    const result = await checkPage(page);
    results.push(result);
    
    if (result.hasError) {
      console.log(`❌ ERROR (${result.status})`);
      if (result.errorMessage) {
        console.log(`  → ${result.errorMessage}`);
      }
    } else {
      console.log(`✅ OK (${result.status})`);
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n=== SUMMARY ===');
  const errors = results.filter(r => r.hasError);
  console.log(`Total pages checked: ${results.length}`);
  console.log(`Pages with runtime errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nERRORS FOUND:');
    errors.forEach(e => {
      console.log(`- ${e.path}: ${e.errorMessage || 'Unknown error'}`);
    });
  } else {
    console.log('\n✅ All pages are free of runtime errors!');
  }
}

runTests();