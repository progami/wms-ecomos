const routes = [
  // Basic routes
  { path: '/', description: 'Root' },
  { path: '/dashboard', description: 'Dashboard' },
  { path: '/operations', description: 'Operations' },
  { path: '/operations/inventory', description: 'Inventory' },
  { path: '/operations/transactions', description: 'Transactions (redirect)' },
  { path: '/finance', description: 'Finance' },
  { path: '/finance/invoices', description: 'Invoices' },
  { path: '/config', description: 'Configuration' },
  { path: '/invalid-route', description: 'Invalid (404)' },
];

async function testRoutes() {
  console.log('🧪 Simple Route Test\n');
  
  for (const route of routes) {
    try {
      const response = await fetch(`http://localhost:3002${route.path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'Accept': 'text/html',
        }
      });
      
      const status = response.status;
      const location = response.headers.get('location');
      
      let result = '';
      if (status === 307 || status === 302 || status === 301) {
        result = `→ ${location || 'unknown'}`;
      } else if (status === 200) {
        result = '✓ OK';
      } else if (status === 404) {
        result = '404';
      } else {
        result = `Status ${status}`;
      }
      
      console.log(`${route.description.padEnd(30)} ${route.path.padEnd(40)} ${result}`);
      
    } catch (error) {
      console.log(`${route.description.padEnd(30)} ${route.path.padEnd(40)} ❌ Error: ${error}`);
    }
  }
}

testRoutes();