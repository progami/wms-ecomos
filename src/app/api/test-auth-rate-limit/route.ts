import { NextRequest, NextResponse } from 'next/server';
import { getAuthRateLimiter, authRateLimitConfig, recordFailedLoginAttempt } from '@/lib/security/auth-rate-limiter';

export async function POST(req: NextRequest) {
  const { username, simulateFailures } = await req.json();
  
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  const results = [];
  
  // Simulate multiple failed login attempts
  for (let i = 1; i <= simulateFailures; i++) {
    // Check rate limit
    const limiter = getAuthRateLimiter();
    const checkResult = await limiter.checkAuthLimit(req, username, authRateLimitConfig);
    
    if (!checkResult.allowed) {
      results.push({
        attempt: i,
        allowed: false,
        reason: checkResult.reason,
        retryAfter: checkResult.retryAfter,
        message: checkResult.reason === 'ip_rate_limit' 
          ? 'Too many login attempts from this IP address'
          : 'Too many failed login attempts for this account'
      });
    } else {
      // Record failed attempt
      recordFailedLoginAttempt(req, username);
      results.push({
        attempt: i,
        allowed: true,
        message: 'Login attempt recorded'
      });
    }
  }
  
  // Get final status
  const limiter = getAuthRateLimiter();
  const finalStatus = await limiter.checkAuthLimit(req, username, authRateLimitConfig);
  
  return NextResponse.json({
    username,
    totalAttempts: simulateFailures,
    results,
    finalStatus: {
      allowed: finalStatus.allowed,
      reason: finalStatus.reason,
      retryAfter: finalStatus.retryAfter,
      shouldLockAccount: finalStatus.shouldLockAccount
    },
    config: {
      windowMinutes: authRateLimitConfig.windowMs / 1000 / 60,
      maxAttempts: authRateLimitConfig.maxAttempts,
      lockoutMinutes: authRateLimitConfig.lockoutDuration / 1000 / 60,
      lockoutThreshold: authRateLimitConfig.lockoutThreshold,
      exponentialBackoff: authRateLimitConfig.exponentialBackoff
    }
  });
}