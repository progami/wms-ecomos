# Login Instructions for Testing

## Quick Access URLs

### Test Pages (No Login Required)
- http://localhost:3000/test-minimal - Basic HTML test page with links
- http://localhost:3000/test-basic - Next.js test page
- http://localhost:3000/test - General test page

### API Test Endpoints (No Login Required)
- http://localhost:3000/api/test-dashboard - Returns test JSON data
- http://localhost:3000/api/admin/dashboard-simple - Returns dashboard data without auth

### Admin Pages (Login Required)
- http://localhost:3000/admin/dashboard - Main admin dashboard
- http://localhost:3000/admin/simple-dashboard - Simplified dashboard for testing
- http://localhost:3000/admin/test - Test admin page

## Default Login Credentials

Based on the seed data, try these credentials:

1. **System Admin**
   - Email: admin@warehouse.com
   - Password: admin123

2. **Finance Admin**
   - Email: finance@warehouse.com
   - Password: finance123

3. **Warehouse Staff**
   - Email: staff@warehouse.com
   - Password: staff123

## Debugging Steps

1. First, visit http://localhost:3000/test-minimal to verify the app is running
2. Try to access http://localhost:3000/api/test-dashboard directly in the browser
3. Go to http://localhost:3000/auth/login to log in
4. After logging in, you should be redirected to the appropriate dashboard

## Current Status

✅ API routes are working
✅ Test pages are accessible
✅ Basic routing is functional
⚠️ Admin pages require authentication via middleware

## Troubleshooting

If login fails:
1. Check if the database is connected
2. Run `npm run db:seed` to ensure test users exist
3. Check browser console for errors
4. Try the simplified dashboard at /admin/simple-dashboard after login