#!/bin/bash

# Direct deployment script using SCP (no S3 required)

echo "======================================"
echo "WMS Direct Deployment via SCP"
echo "======================================"
echo ""
echo "This script will directly copy the deployment package to EC2 using SCP."
echo ""

# Variables
DEPLOYMENT_FILE="wms-deployment-minimal.tar.gz"
EC2_IP="54.243.188.216"
EC2_USER="ubuntu"
KEY_PATH=""  # User needs to provide this

# Check if deployment file exists
if [ ! -f "$DEPLOYMENT_FILE" ]; then
    echo "❌ Deployment file not found: $DEPLOYMENT_FILE"
    echo "Please run ./create-deployment-minimal.sh first"
    exit 1
fi

# Get the key path from user
echo "Please provide the path to your EC2 private key file:"
read -r KEY_PATH

if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Key file not found: $KEY_PATH"
    exit 1
fi

echo ""
echo "📦 Deployment package: $DEPLOYMENT_FILE ($(du -h $DEPLOYMENT_FILE | cut -f1))"
echo "🔑 Using key: $KEY_PATH"
echo "🖥️  Target: $EC2_USER@$EC2_IP"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Copy deployment package to EC2
echo "📤 Copying deployment package to EC2..."
if scp -i "$KEY_PATH" "$DEPLOYMENT_FILE" "$EC2_USER@$EC2_IP:~/" ; then
    echo "✅ File copied successfully!"
    echo ""
    echo "Now, SSH into the instance and run these commands:"
    echo ""
    echo "ssh -i $KEY_PATH $EC2_USER@$EC2_IP"
    echo ""
    cat << 'DEPLOYMENT_COMMANDS'
# Once logged into EC2, run:

# Create deployment directory
sudo mkdir -p /var/www/wms
cd /var/www/wms

# Extract the package
sudo tar -xzf ~/wms-deployment-minimal.tar.gz

# Set proper ownership
sudo chown -R ubuntu:ubuntu /var/www/wms

# Install dependencies (this will take a few minutes)
npm ci --production

# Copy and configure environment file
if [ -f .env.production ]; then
    cp .env.production .env
    echo "Please edit .env file with your actual values:"
    nano .env
fi

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Install PM2 if not already installed
sudo npm install -g pm2

# Stop existing instance if running
pm2 delete wms || true

# Start the application
pm2 start server.js --name wms --max-memory-restart 1G

# Save PM2 configuration
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Check status
pm2 status
pm2 logs wms --lines 50

echo "Deployment complete! Check https://www.targonglobal.com/WMS"
DEPLOYMENT_COMMANDS
    
else
    echo "❌ Failed to copy file to EC2. Please check your connection and permissions."
    exit 1
fi