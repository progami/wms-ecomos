// Simple test to check if the issue is with our setup
const http = require('http');

console.log('Testing connection to localhost:3002...');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received, length:', data.length);
    
    // Check for specific errors
    if (data.includes('webpack') && data.includes('call')) {
      console.log('\n⚠️  WEBPACK ERROR DETECTED!');
      console.log('The page contains webpack module loading errors.');
    }
    
    if (data.includes('hydration')) {
      console.log('\n⚠️  HYDRATION ERROR DETECTED!');
    }
    
    // Save to file for inspection
    require('fs').writeFileSync('page-response.html', data);
    console.log('\nPage saved to page-response.html');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.log('\nMake sure the dev server is running on port 3002');
});

req.end();