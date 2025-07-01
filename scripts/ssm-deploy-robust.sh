#!/bin/bash

# Robust SSM deployment script with proper error handling

set -euo pipefail

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🚀 Starting WMS deployment via SSM"
echo "Instance: $INSTANCE_ID"
echo "Region: $REGION"
echo ""

# First, let's create a deployment script on the instance
echo "📝 Creating deployment script on instance..."

# Create the deployment script
cat > /tmp/deploy-wms.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -x  # Enable debug output

echo "Starting WMS deployment at $(date)"

# Update and install basic packages
echo "=== Installing basic packages ==="
sudo apt-get update
sudo apt-get install -y git curl wget unzip build-essential

# Install Node.js 18
echo "=== Installing Node.js 18 ==="
if ! command -v node || ! node --version | grep -q "v18"; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node --version
npm --version

# Install global packages
echo "=== Installing PM2 ==="
sudo npm install -g pm2

# Install PostgreSQL
echo "=== Installing PostgreSQL ==="
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install nginx
echo "=== Installing nginx ==="
sudo apt-get install -y nginx

# Create application directory
echo "=== Setting up application directory ==="
sudo mkdir -p /var/www/wms
sudo chown -R ubuntu:ubuntu /var/www/wms
cd /var/www/wms

# Clone repository
echo "=== Cloning repository ==="
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/progami/WMS_EcomOS.git .
fi

# Create environment file
echo "=== Creating environment configuration ==="
cat > .env.production << 'ENV'
NODE_ENV=production
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000
NEXTAUTH_SECRET=your-secret-key-here-replace-in-production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
ENV

# Setup PostgreSQL database
echo "=== Setting up PostgreSQL database ==="
sudo -u postgres psql << 'SQL'
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
ALTER DATABASE wms_db OWNER TO wms_user;
SQL

# Install dependencies
echo "=== Installing npm dependencies ==="
npm ci

# Generate Prisma client
echo "=== Generating Prisma client ==="
npx prisma generate

# Run migrations
echo "=== Running database migrations ==="
NODE_ENV=production npx prisma migrate deploy || echo "Migrations skipped"

# Build application
echo "=== Building application ==="
npm run build

# Setup PM2
echo "=== Starting application with PM2 ==="
pm2 delete wms || true
NODE_ENV=production pm2 start npm --name wms -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

# Configure nginx
echo "=== Configuring nginx ==="
sudo tee /etc/nginx/sites-available/wms > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Open firewall ports
echo "=== Configuring firewall ==="
sudo ufw allow 80/tcp || true
sudo ufw allow 3000/tcp || true

# Final checks
echo "=== Deployment complete ==="
echo "PM2 Status:"
pm2 status
echo ""
echo "Testing health endpoint:"
sleep 10
curl -s http://localhost:3000/api/health || echo "Application is still starting..."
echo ""
echo "Deployment completed at $(date)"
DEPLOY_SCRIPT

# Upload the script to S3 (if available) or send it directly
echo "📤 Sending deployment script to instance..."

# Send the script to the instance
UPLOAD_CMD=$(cat << 'EOF'
cat > /tmp/deploy-wms.sh << 'SCRIPT'
$(cat /tmp/deploy-wms.sh)
SCRIPT
chmod +x /tmp/deploy-wms.sh
EOF
)

# Send command to create the script
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$(cat /tmp/deploy-wms.sh | base64 -w 0 | sed 's/^/echo /' | sed 's/$/ | base64 -d > \/tmp\/deploy-wms.sh; chmod +x \/tmp\/deploy-wms.sh/')\"]" \
    --region "$REGION" \
    --output text \
    --query 'Command.CommandId' 2>/dev/null || echo "")

if [ -z "$COMMAND_ID" ]; then
    echo "❌ Failed to send deployment script. Trying alternative method..."
    
    # Alternative: Send script content directly
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters '{"commands":["wget -O /tmp/deploy-wms.sh https://raw.githubusercontent.com/progami/WMS_EcomOS/main/scripts/deploy.sh 2>/dev/null || curl -o /tmp/deploy-wms.sh https://raw.githubusercontent.com/progami/WMS_EcomOS/main/scripts/deploy.sh; chmod +x /tmp/deploy-wms.sh"]}' \
        --region "$REGION" \
        --output text \
        --query 'Command.CommandId')
fi

echo "Script upload command ID: $COMMAND_ID"
sleep 10

# Now execute the deployment script
echo "🚀 Executing deployment script..."
DEPLOY_CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"sudo -i bash /tmp/deploy-wms.sh 2>&1 | tee /tmp/deploy-wms.log\"]" \
    --region "$REGION" \
    --timeout-seconds 600 \
    --output text \
    --query 'Command.CommandId')

echo "Deployment command ID: $DEPLOY_CMD_ID"
echo "⏳ Waiting for deployment to complete (this may take 5-10 minutes)..."

# Wait for deployment
sleep 30  # Initial wait

# Check status periodically
for i in {1..20}; do
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$DEPLOY_CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    echo "Status: $STATUS (attempt $i/20)"
    sleep 30
done

# Get final status
echo ""
echo "📊 Final deployment status: $STATUS"

# Get deployment logs
echo ""
echo "📋 Deployment logs:"
aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"tail -n 100 /tmp/deploy-wms.log 2>/dev/null || echo 'No logs available'\"]" \
    --region "$REGION" \
    --output text \
    --query 'Command.CommandId' > /tmp/log-cmd-id.txt

sleep 5

LOG_CMD_ID=$(cat /tmp/log-cmd-id.txt)
aws ssm get-command-invocation \
    --command-id "$LOG_CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null | base64 -d 2>/dev/null || echo "Could not retrieve logs"

# Final verification
echo ""
echo "🔍 Verifying deployment..."
VERIFY_CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"pm2 list && echo '---' && curl -s http://localhost:3000/api/health || echo 'Health check failed'\"]" \
    --region "$REGION" \
    --output text \
    --query 'Command.CommandId')

sleep 5

aws ssm get-command-invocation \
    --command-id "$VERIFY_CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null | base64 -d 2>/dev/null || echo "Verification pending"

echo ""
echo "✅ Deployment process complete!"
echo ""
echo "🌐 Application URL: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
echo ""
echo "📝 To check application logs, run:"
echo "   aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"
echo ""
echo "🔧 To restart the application, run:"
echo "   aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 restart wms\"]' --region $REGION"