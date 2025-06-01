#!/bin/bash

# Start development script for Warehouse Management System

echo "🚀 Starting Warehouse Management System..."

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw warehouse_management; then
    echo "📦 Creating database..."
    createdb warehouse_management
fi

echo "✅ Database ready"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your database credentials"
fi

# Run migrations if needed
echo "🔄 Checking database schema..."
npm run db:push

# Start the development server
echo "🌐 Starting development server..."
echo "📍 Open http://localhost:3000 in your browser"
echo ""
echo "🔐 Login credentials:"
echo "   Admin: admin@warehouse.com / admin123"
echo "   Staff: staff@warehouse.com / staff123"
echo "   Finance: finance@warehouse.com / finance123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev