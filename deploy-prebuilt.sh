#!/bin/bash
set -e

echo "Starting deployment of pre-built WMS application..."

# Variables
DEPLOYMENT_DIR="/var/www/wms"
S3_BUCKET="wms-deployment-1751383624"
PACKAGE_NAME="wms-built-minimal.tar.gz"
APP_NAME="wms"

# Create deployment directory if it doesn't exist
echo "Setting up deployment directory..."
sudo mkdir -p $DEPLOYMENT_DIR
sudo chown ubuntu:ubuntu $DEPLOYMENT_DIR

# Download package from S3
echo "Downloading package from S3..."
cd /tmp
aws s3 cp s3://$S3_BUCKET/$PACKAGE_NAME .

# Extract package to deployment directory
echo "Extracting package..."
cd $DEPLOYMENT_DIR
tar -xzf /tmp/$PACKAGE_NAME

# Install production dependencies only
echo "Installing production dependencies..."
npm ci --production

# Create .env file if it doesn't exist
echo "Setting up environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOL
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=$(openssl rand -base64 32)
EOL
fi

# Load environment variables
source .env
export DATABASE_URL

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Setup PM2
echo "Setting up PM2..."
pm2 delete $APP_NAME 2>/dev/null || true

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$DEPLOYMENT_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/wms-error.log',
    out_file: '/var/log/pm2/wms-out.log',
    log_file: '/var/log/pm2/wms-combined.log'
  }]
};
EOL

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown ubuntu:ubuntu /var/log/pm2

# Start application with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Display status
echo "Deployment complete! Checking application status..."
pm2 status
pm2 logs --lines 20

echo "Application should be running on port 3000"
echo "You can check logs with: pm2 logs wms"
echo "Clean up temporary file..."
rm -f /tmp/$PACKAGE_NAME