# Debugging Guide for Warehouse Management System

## Current Setup

The application is now running on http://localhost:3001 (port 3000 was busy).

## Test Credentials

- **Admin User**: admin@warehouse.com / admin123
- **Finance User**: finance@warehouse.com / finance123
- **Warehouse Staff**: staff@warehouse.com / staff123

## Debugging Steps

### 1. Check Basic Connectivity

Visit http://localhost:3001/api/test to see if the API is working. This endpoint will show:
- Database connection status
- Session information
- Table existence

### 2. Login Flow

1. Go to http://localhost:3001
2. You should be redirected to /auth/login
3. Login with admin credentials
4. You should be redirected to /admin/dashboard

### 3. Check Browser Console

After logging in, open browser DevTools (F12) and check:
- Console tab for any errors
- Network tab to see API calls
- Look for the `/api/admin/dashboard` request

### 4. Common Issues and Solutions

#### Issue: 401 Unauthorized
- **Cause**: Session not being recognized
- **Solution**: Clear cookies and login again

#### Issue: 500 Server Error
- **Cause**: Database connection or query issues
- **Check**: 
  - Is PostgreSQL running? (`pg_ctl status` or `brew services list`)
  - Check server logs in terminal

#### Issue: No Data Showing
- **Cause**: Empty database tables
- **Solution**: We've already run the seed script

#### Issue: CORS errors
- **Cause**: Usually not an issue with Next.js API routes
- **Solution**: Check if you're accessing from correct URL

### 5. API Endpoints to Test

1. **Test endpoint**: http://localhost:3001/api/test
2. **Admin Dashboard**: http://localhost:3001/api/admin/dashboard (requires admin auth)
3. **Simple Dashboard**: http://localhost:3001/api/admin/dashboard-simple (for testing)

### 6. Database Verification

Run these commands to verify database state:

```bash
# Check if tables have data
npx prisma studio
```

This will open Prisma Studio where you can browse the database.

### 7. Enhanced Logging

The code now includes enhanced logging:
- API routes log when called
- Client components log fetch attempts and responses
- Database queries are wrapped in try-catch blocks

### 8. What to Look For

In the browser console, you should see:
```
Fetching dashboard stats...
Response status: 200
Dashboard data received: {stats: {...}, systemInfo: {...}}
```

If you see a 401, it means authentication is failing.
If you see a 500, check the server logs for database errors.

### 9. Server Logs

In the terminal where you ran `npm run dev`, look for:
- "Admin dashboard API called"
- "Database connection test: ..."
- "Session: ..."
- Any error messages

### 10. Quick Fixes

If nothing works:
1. Stop the server (Ctrl+C)
2. Clear your browser cookies
3. Run: `npx prisma generate`
4. Run: `npm run dev`
5. Login again with admin@warehouse.com / admin123

## Next Steps

Once you can access the dashboard:
1. The admin dashboard should show inventory stats
2. Navigation should work to other pages
3. Data should be fetched from the database

The issue was likely:
1. Missing seed data (now fixed)
2. Session/authentication issues
3. Database connection problems

The enhanced logging should help identify the exact issue.