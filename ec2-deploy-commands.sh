#!/bin/bash

# EC2 Deployment Commands
# This script should be run on the EC2 instance after copying the deployment package

set -e

echo "Starting WMS deployment on EC2..."

# Check if deployment file exists
if [ ! -f ~/wms-deployment-minimal.tar.gz ]; then
    echo "❌ Deployment file not found in home directory"
    echo "Please upload wms-deployment-minimal.tar.gz to the home directory first"
    exit 1
fi

# Create deployment directory
echo "Creating deployment directory..."
sudo mkdir -p /var/www/wms
cd /var/www/wms

# Extract the package
echo "Extracting deployment package..."
sudo tar -xzf ~/wms-deployment-minimal.tar.gz

# Set proper ownership
echo "Setting proper ownership..."
sudo chown -R ubuntu:ubuntu /var/www/wms

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
npm ci --production

# Setup environment
if [ -f .env.production ]; then
    if [ ! -f .env ]; then
        echo "Setting up environment configuration..."
        cp .env.production .env
        echo ""
        echo "⚠️  IMPORTANT: Please edit the .env file with your actual values"
        echo "Run: nano .env"
        echo ""
        echo "After editing, run the rest of the deployment:"
        echo "cd /var/www/wms && npx prisma migrate deploy && npx prisma generate && pm2 delete wms || true && pm2 start server.js --name wms --max-memory-restart 1G && pm2 save"
        exit 0
    fi
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing instance if running
echo "Stopping existing application instance..."
pm2 delete wms || true

# Start the application
echo "Starting application with PM2..."
pm2 start server.js --name wms --max-memory-restart 1G

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
pm2 status
echo ""
echo "To view logs: pm2 logs wms"
echo "To restart: pm2 restart wms"
echo ""
echo "The application should be accessible at: https://www.targonglobal.com/WMS"