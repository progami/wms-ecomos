# Authentication Security Guide

## Overview

This document outlines the security measures implemented in the WMS authentication system and best practices for deployment.

## Security Features

### 1. Environment-Based Authentication

#### Development Mode
- Quick fill buttons are **only** visible when `NODE_ENV === 'development'`
- Provides convenient access to test accounts for developers
- Should **never** be enabled in production

#### Production Mode
- No quick fill buttons or hardcoded credentials visible
- Clean login form without any credential hints
- All passwords must be provided via environment variables

### 2. Password Management

#### Environment Variables

**Demo Setup API Variables:**
- `DEMO_ADMIN_PASSWORD` - Password for demo admin account
- `DEMO_STAFF_PASSWORD` - Password for demo staff accounts

**Client-Side Variables (Development Only):**
- `NEXT_PUBLIC_DEMO_PASSWORD` - For demo login functionality
- `NEXT_PUBLIC_ADMIN_PASSWORD` - For admin quick fill (dev only)
- `NEXT_PUBLIC_STAFF_PASSWORD` - For staff quick fill (dev only)

⚠️ **WARNING**: Never set `NEXT_PUBLIC_*` password variables in production as they are exposed to the client.

### 3. Implementation Details

#### Login Page (`src/app/auth/login/page.tsx`)
```typescript
// Quick fill buttons only render in development
{process.env.NODE_ENV === 'development' && (
  // Quick fill UI components
)}
```

#### Demo Setup (`src/app/api/demo/setup/route.ts`)
```typescript
// Passwords from environment with fallbacks
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD || 'SecureWarehouse2024!'
const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD || 'DemoStaff2024!'
```

## Production Deployment Checklist

1. **Environment Configuration**
   - [ ] Set `NODE_ENV=production`
   - [ ] Set strong passwords for `DEMO_ADMIN_PASSWORD` and `DEMO_STAFF_PASSWORD`
   - [ ] Ensure no `NEXT_PUBLIC_*_PASSWORD` variables are set
   - [ ] Verify `NEXTAUTH_SECRET` is set with a cryptographically secure value

2. **Code Verification**
   - [ ] Confirm quick fill buttons don't appear on login page
   - [ ] Verify no hardcoded passwords in source code
   - [ ] Check that all authentication flows use environment variables

3. **Access Control**
   - [ ] Document how production credentials are distributed to authorized users
   - [ ] Implement proper password rotation policies
   - [ ] Consider adding multi-factor authentication for admin accounts

## Security Best Practices

1. **Password Requirements**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and special characters
   - Unique passwords for each environment
   - Regular password rotation (every 90 days recommended)

2. **Environment Isolation**
   - Never use development passwords in production
   - Keep production environment variables separate from development
   - Use secret management tools (e.g., AWS Secrets Manager, HashiCorp Vault)

3. **Monitoring**
   - Log failed login attempts
   - Monitor for suspicious authentication patterns
   - Set up alerts for multiple failed login attempts

## Contact Information

For production credentials or security concerns, contact:
- System Administrator: [admin email]
- Security Team: [security email]

---

Last Updated: [Current Date]
Version: 1.0