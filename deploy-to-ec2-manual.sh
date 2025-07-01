#!/bin/bash

# Manual deployment script for EC2 instance
# This script provides instructions and commands for manual deployment

cat << 'EOF'
===========================================
WMS Manual Deployment Instructions for EC2
===========================================

Since SSM is not working, you'll need to:

1. Upload the deployment package to S3 and get a presigned URL
2. SSH into the EC2 instance
3. Download and deploy the application

STEP 1: Upload to S3 and get presigned URL
-------------------------------------------
# On your local machine:
aws s3 cp wms-deployment-minimal.tar.gz s3://targonglobal-wms-storage/deployments/
aws s3 presign s3://targonglobal-wms-storage/deployments/wms-deployment-minimal.tar.gz --expires-in 3600

STEP 2: SSH into EC2 instance
-----------------------------
ssh -i your-key.pem ubuntu@54.243.188.216

STEP 3: On the EC2 instance, run these commands
-----------------------------------------------
# Navigate to home directory
cd ~

# Download the deployment package (replace URL with your presigned URL)
wget -O wms-deployment-minimal.tar.gz "PRESIGNED_URL_HERE"

# Create deployment directory
sudo mkdir -p /var/www/wms
cd /var/www/wms

# Extract the package
sudo tar -xzf ~/wms-deployment-minimal.tar.gz

# Set proper ownership
sudo chown -R ubuntu:ubuntu /var/www/wms

# Install dependencies
npm ci --production

# Set up environment file
# Copy the .env.production file and edit it with your actual values
cp .env.production .env
# Edit the file to set proper database credentials and other settings
nano .env

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Install PM2 if not already installed
sudo npm install -g pm2

# Start the application with PM2
pm2 delete wms || true
pm2 start server.js --name wms --max-memory-restart 1G

# Save PM2 configuration
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure Nginx (if not already configured)
sudo nano /etc/nginx/sites-available/default
# Add the following location block:
#
# location /WMS {
#     proxy_pass http://localhost:3000;
#     proxy_http_version 1.1;
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection 'upgrade';
#     proxy_set_header Host $host;
#     proxy_cache_bypass $http_upgrade;
#     proxy_set_header X-Real-IP $remote_addr;
#     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#     proxy_set_header X-Forwarded-Proto $scheme;
# }

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Check application status
pm2 status
pm2 logs wms --lines 50

# The application should now be accessible at:
# https://www.targonglobal.com/WMS

TROUBLESHOOTING
---------------
If you encounter issues:

1. Check PM2 logs: pm2 logs wms
2. Check Nginx error logs: sudo tail -f /var/log/nginx/error.log
3. Verify database connection: psql -U wms_user -d wms_production -h localhost
4. Check port 3000: sudo lsof -i :3000
5. Verify environment variables: pm2 env wms

To restart the application:
pm2 restart wms

To view real-time logs:
pm2 logs wms --follow

EOF