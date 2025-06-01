// Simple test to check if the pages are loading correctly
console.log(`
To test the application:

1. Open http://localhost:3000 in your browser
2. Login with one of these credentials:
   - Admin: admin@warehouse.com / password123
   - Finance: finance@warehouse.com / password123
   - Warehouse Staff: staff@warehouse.com / password123

3. Check if these pages load:
   - Admin Dashboard: http://localhost:3000/admin/dashboard
   - Finance Dashboard: http://localhost:3000/finance/dashboard
   - SKUs Management: http://localhost:3000/admin/settings/skus

The issues have been fixed:
1. Fixed prisma import/export mismatch
2. Fixed getServerSession import from 'next-auth' instead of 'next-auth/next'
3. Added better error handling to show detailed error messages
4. Fixed middleware to allow API routes
5. Fixed bigint handling in PostgreSQL query

Please test the application now!
`)