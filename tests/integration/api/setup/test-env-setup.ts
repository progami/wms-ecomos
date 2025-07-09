import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Setup test environment variables
export function setupTestEnvironment() {
  // Ensure we have a test environment file
  const testEnvPath = path.join(__dirname, '../.env.test')
  const exampleEnvPath = path.join(__dirname, '../.env.test.example')
  
  if (!fs.existsSync(testEnvPath) && fs.existsSync(exampleEnvPath)) {
    console.log('Creating .env.test from .env.test.example...')
    fs.copyFileSync(exampleEnvPath, testEnvPath)
  }
  
  // Load test environment variables
  if (fs.existsSync(testEnvPath)) {
    require('dotenv').config({ path: testEnvPath })
  }
  
  // Set default test environment variables if not already set
  process.env.NODE_ENV = process.env.NODE_ENV || 'test'
  process.env.USE_TEST_AUTH = 'true'
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only'
  process.env.TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  
  // Ensure the test server is running
  if (!process.env.SKIP_TEST_SERVER_CHECK) {
    checkTestServerRunning()
  }
}

// Check if test server is running
function checkTestServerRunning() {
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3001'
  
  try {
    // Try to reach the health endpoint
    execSync(`curl -s -o /dev/null -w "%{http_code}" ${serverUrl}/api/health`, {
      stdio: 'pipe'
    })
  } catch (error) {
    console.error(`
    ⚠️  Test server is not running at ${serverUrl}
    
    Please start the test server before running integration tests:
    
    1. In a separate terminal, run:
       npm run dev
    
    2. Wait for the server to start
    
    3. Run the tests again
    `)
    process.exit(1)
  }
}

// Export for use in jest setup
export default setupTestEnvironment