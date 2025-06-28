#!/bin/bash
# Quick deployment script for WMS
# Run this after initial setup to deploy updates

set -e

echo "🚀 WMS Quick Deploy Script"
echo "========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in WMS root directory"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment archive
echo "🗜️ Creating deployment archive..."
tar -czf wms-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env* \
  --exclude=logs \
  --exclude=backups \
  --exclude=.next/cache \
  --exclude=prisma/*.db \
  --exclude=deploy \
  .

echo "✅ Deployment archive created: wms-deploy.tar.gz"
echo ""
echo "📋 Next steps:"
echo "1. Upload to EC2: scp -i your-key.pem wms-deploy.tar.gz ubuntu@ec2-ip:~/"
echo "2. On EC2, extract: cd /var/www/wms && tar -xzf ~/wms-deploy.tar.gz"
echo "3. Install deps: npm ci --production"
echo "4. Run migrations: npx prisma migrate deploy"
echo "5. Restart PM2: pm2 restart wms-app"