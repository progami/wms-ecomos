#!/bin/bash
# Production deployment script for WMS with BASE_PATH=/WMS

set -e

echo "🚀 Starting WMS production deployment..."

# Create required directories
mkdir -p /home/wms/app
mkdir -p /home/wms/logs
mkdir -p /home/wms/backups

cd /home/wms/app

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application with production environment
echo "🏗️ Building application..."
NODE_ENV=production npm run build

# Create or update .env.production.local with instance-specific values
echo "⚙️ Setting up environment variables..."
cat > .env.production.local << 'EOF'
# Production Environment - Instance Specific
NODE_ENV=production
BASE_PATH=/WMS
NEXT_PUBLIC_BASE_PATH=/WMS

# Database
DATABASE_URL="${DATABASE_URL}"

# Authentication
NEXTAUTH_URL="https://www.targonglobal.com/WMS"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Application URLs
NEXT_PUBLIC_APP_URL="https://www.targonglobal.com/WMS"

# Redis (if using local Redis)
REDIS_URL="redis://localhost:6379"

# Logging
LOG_LEVEL="info"
EOF

# Stop existing PM2 process
echo "🛑 Stopping existing application..."
pm2 stop wms-app || true
pm2 delete wms-app || true

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Show status
pm2 status

echo "✅ Deployment complete!"
echo "📍 Application running at: https://www.targonglobal.com/WMS"
echo "🔍 Check logs with: pm2 logs wms-app"