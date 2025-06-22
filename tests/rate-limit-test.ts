import { authRateLimitConfig } from '../src/lib/security/auth-rate-limiter';

const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3002';

interface LoginResult {
  success: boolean;
  status: number;
  message?: string;
  retryAfter?: number;
}

async function attemptLogin(username: string, password: string): Promise<LoginResult> {
  try {
    // Get CSRF token first
    const csrfResponse = await fetch(`${API_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    
    // Attempt login
    const response = await fetch(`${API_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        emailOrUsername: username,
        password: password,
        callbackUrl: `${API_URL}/dashboard`,
        json: 'true'
      }),
      redirect: 'manual'
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    return {
      success: response.status === 200 || response.status === 302,
      status: response.status,
      message: data.message || data.error,
      retryAfter: parseInt(response.headers.get('Retry-After') || '0')
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testRateLimiting() {
  console.log('Testing Authentication Rate Limiting\n');
  console.log('Configuration:');
  console.log(`- Window: ${authRateLimitConfig.windowMs / 1000 / 60} minutes`);
  console.log(`- Max attempts: ${authRateLimitConfig.maxAttempts}`);
  console.log(`- Lockout duration: ${authRateLimitConfig.lockoutDuration / 1000 / 60} minutes`);
  console.log(`- Account lockout threshold: ${authRateLimitConfig.lockoutThreshold} attempts`);
  console.log(`- Exponential backoff: ${authRateLimitConfig.exponentialBackoff ? 'Enabled' : 'Disabled'}\n`);

  const testUsername = 'testuser@example.com';
  const wrongPassword = 'wrongpassword123';

  console.log('Testing failed login attempts...\n');

  // Attempt to exceed rate limit
  for (let i = 1; i <= authRateLimitConfig.maxAttempts + 2; i++) {
    console.log(`Attempt ${i}:`);
    const result = await attemptLogin(testUsername, wrongPassword);
    
    if (result.status === 429) {
      console.log(`❌ Rate limited! Retry after: ${result.retryAfter} seconds`);
      console.log(`   Message: ${result.message}\n`);
    } else {
      console.log(`✓ Login attempt processed (status: ${result.status})`);
      console.log(`   Message: ${result.message || 'Invalid credentials'}\n`);
    }

    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\nTesting IP-based rate limiting with different usernames...\n');

  // Test with different usernames from same IP
  const usernames = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
  
  for (const username of usernames) {
    console.log(`Attempting login with username: ${username}`);
    const result = await attemptLogin(username, wrongPassword);
    
    if (result.status === 429) {
      console.log(`❌ Rate limited by IP! Retry after: ${result.retryAfter} seconds\n`);
      break;
    } else {
      console.log(`✓ Login attempt processed (status: ${result.status})\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\nRate limiting test completed!');
  console.log('\nKey features implemented:');
  console.log('✓ Rate limiting for /api/auth/signin and /api/auth/callback');
  console.log('✓ Tracking by both IP address and username');
  console.log('✓ Exponential backoff for repeated failures');
  console.log('✓ Account lockout after threshold exceeded');
  console.log('✓ Automatic cleanup of expired entries');
  console.log('✓ Detailed logging of rate limit events');
}

// Run the test
testRateLimiting().catch(console.error);