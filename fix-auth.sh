#!/bin/bash

echo "🔧 Fixing authentication setup..."

# Kill any existing Next.js processes
echo "Stopping existing Next.js processes..."
pkill -f "next dev" || true
sleep 2

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next

# Ensure database is seeded
echo "Running database seed..."
npm run db:seed

# Start the server
echo "Starting development server..."
npm run dev &

echo "
✅ Authentication fix complete!

Test credentials:
- Admin: admin@warehouse.com / admin123
- Staff: staff@warehouse.com / staff123
- Finance: finance@warehouse.com / finance123

Access the app at: http://localhost:3000

Debug pages:
- Login: http://localhost:3000/auth/login
- Auth Debug: http://localhost:3000/test/auth-debug
- API Test: http://localhost:3000/api/test/db
"