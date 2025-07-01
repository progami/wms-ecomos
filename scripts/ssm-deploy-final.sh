#!/bin/bash

# Final comprehensive deployment script for WMS via SSM

set -euo pipefail

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🚀 Starting final WMS deployment to $INSTANCE_ID"
echo "This will ensure the application is properly installed and running"
echo ""

# Check SSM connectivity
STATUS=$(aws ssm describe-instance-information \
    --instance-information-filter-list key=InstanceIds,valueSet="$INSTANCE_ID" \
    --region "$REGION" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null || echo "NotFound")

if [ "$STATUS" != "Online" ]; then
    echo "❌ Instance is not reachable via SSM"
    exit 1
fi

echo "✅ SSM agent is online"
echo ""

# Create deployment script content
cat > /tmp/wms-deploy-final.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "=== WMS Final Deployment Script ==="
echo "Time: $(date)"
echo ""

# Function to check and report status
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ Success: $1"
    else
        echo "❌ Failed: $1"
        exit 1
    fi
}

# 1. System preparation
echo "1. Preparing system..."
sudo apt-get update -y
check_status "System update"

# 2. Install Node.js 18
echo ""
echo "2. Installing Node.js 18..."
if ! command -v node || ! node --version | grep -q "v18"; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node --version
check_status "Node.js installation"

# 3. Install required packages
echo ""
echo "3. Installing required packages..."
sudo apt-get install -y git postgresql postgresql-contrib nginx build-essential
sudo npm install -g pm2
check_status "Package installation"

# 4. Setup PostgreSQL
echo ""
echo "4. Setting up PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS wms_db;
CREATE DATABASE wms_db;
DROP USER IF EXISTS wms_user;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
ALTER DATABASE wms_db OWNER TO wms_user;
\q
EOF
check_status "PostgreSQL setup"

# 5. Setup application directory
echo ""
echo "5. Setting up application directory..."
sudo rm -rf /var/www/wms
sudo mkdir -p /var/www/wms
sudo chown -R ubuntu:ubuntu /var/www/wms
cd /var/www/wms
check_status "Directory setup"

# 6. Clone repository
echo ""
echo "6. Cloning repository..."
git clone https://github.com/progami/WMS_EcomOS.git .
check_status "Repository clone"

# 7. Create environment file
echo ""
echo "7. Creating environment configuration..."
cat > .env.production << 'ENV'
NODE_ENV=production
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
ENV
check_status "Environment configuration"

# 8. Install dependencies
echo ""
echo "8. Installing dependencies..."
npm ci
check_status "Dependency installation"

# 9. Generate Prisma client
echo ""
echo "9. Generating Prisma client..."
npx prisma generate
check_status "Prisma generation"

# 10. Run migrations
echo ""
echo "10. Running database migrations..."
NODE_ENV=production npx prisma migrate deploy || npx prisma db push
check_status "Database migrations"

# 11. Build application
echo ""
echo "11. Building application..."
npm run build
check_status "Application build"

# 12. Configure PM2
echo ""
echo "12. Configuring PM2..."
pm2 delete all 2>/dev/null || true
NODE_ENV=production PORT=3000 pm2 start npm --name wms -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | grep sudo | bash || true
check_status "PM2 configuration"

# 13. Configure nginx
echo ""
echo "13. Configuring nginx..."
sudo tee /etc/nginx/sites-available/wms > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
check_status "Nginx configuration"

# 14. Configure firewall
echo ""
echo "14. Configuring firewall..."
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 3000/tcp 2>/dev/null || true
check_status "Firewall configuration"

# 15. Wait for application to start
echo ""
echo "15. Waiting for application to start..."
sleep 15

# 16. Verify deployment
echo ""
echo "16. Verifying deployment..."
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Port listeners:"
sudo netstat -tlnp | grep -E ':80|:3000'
echo ""
echo "Testing health endpoint:"
curl -s http://localhost:3000/api/health | jq . || echo "Health check pending..."
echo ""
echo "Testing nginx proxy:"
curl -s http://localhost/api/health | jq . || echo "Nginx proxy pending..."
echo ""

echo "=== Deployment Complete ==="
echo "Time: $(date)"
echo ""
echo "Application URLs:"
echo "- Direct: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
echo "- Via Nginx: http://ec2-54-221-58-217.compute-1.amazonaws.com"
echo ""
echo "To view logs: pm2 logs wms"
echo "To restart: pm2 restart wms"
DEPLOY_SCRIPT

# Upload and execute the deployment script
echo "📤 Uploading deployment script..."

# Convert script to base64 for safe transmission
SCRIPT_B64=$(base64 < /tmp/wms-deploy-final.sh | tr -d '\n')

# Send script to instance
UPLOAD_CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters "commands=[\"echo '$SCRIPT_B64' | base64 -d > /tmp/deploy-final.sh && chmod +x /tmp/deploy-final.sh\"]" \
    --output text \
    --query 'Command.CommandId')

echo "Upload command ID: $UPLOAD_CMD_ID"
sleep 10

# Execute the deployment script
echo ""
echo "🚀 Executing deployment..."
DEPLOY_CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --timeout-seconds 900 \
    --parameters "commands=[\"sudo -i bash /tmp/deploy-final.sh 2>&1 | tee /tmp/deploy-final.log\"]" \
    --output text \
    --query 'Command.CommandId')

echo "Deploy command ID: $DEPLOY_CMD_ID"
echo "⏳ Waiting for deployment to complete (this will take 5-10 minutes)..."

# Monitor deployment
attempts=0
max_attempts=60  # 10 minutes
while [ $attempts -lt $max_attempts ]; do
    sleep 10
    
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    attempts=$((attempts + 1))
    if [ $((attempts % 6)) -eq 0 ]; then
        echo "Still deploying... ($((attempts / 6)) minutes elapsed)"
    else
        echo -n "."
    fi
done

echo ""
echo "Deployment status: $STATUS"

# Get deployment logs
if [ "$STATUS" = "Success" ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📋 Getting deployment summary..."
    
    SUMMARY_CMD_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --region "$REGION" \
        --parameters "commands=[\"tail -50 /tmp/deploy-final.log | grep -E '(✅|❌|PM2|Application URLs|Health check)' || tail -30 /tmp/deploy-final.log\"]" \
        --output text \
        --query 'Command.CommandId')
    
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id "$SUMMARY_CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null || echo "Summary not available"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "📋 Error details:"
    aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null || echo "No error details available"
fi

# Test the application
echo ""
echo "🔍 Testing application accessibility..."
echo ""
echo -n "Testing port 3000: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://ec2-54-221-58-217.compute-1.amazonaws.com:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success (HTTP $HTTP_CODE)"
else
    echo "❌ Failed (HTTP $HTTP_CODE)"
fi

echo -n "Testing port 80: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://ec2-54-221-58-217.compute-1.amazonaws.com 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Success (HTTP $HTTP_CODE)"
else
    echo "❌ Failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "📝 Deployment Summary:"
echo "- Instance ID: $INSTANCE_ID"
echo "- Deploy Command ID: $DEPLOY_CMD_ID"
echo "- Application URLs:"
echo "  - http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
echo "  - http://ec2-54-221-58-217.compute-1.amazonaws.com"
echo ""
echo "🔧 Useful commands:"
echo "- Check logs: aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"
echo "- Restart app: aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 restart wms\"]' --region $REGION"
echo "- Check status: aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 status\"]' --region $REGION"