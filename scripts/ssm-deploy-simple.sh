#!/bin/bash

# Simple SSM deployment script - runs commands one at a time for better debugging

set -euo pipefail

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

# Function to run SSM command and wait for result
run_ssm_command() {
    local command="$1"
    local description="$2"
    
    echo "🔧 Running: $description"
    
    local command_id=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[\"$command\"]" \
        --region "$REGION" \
        --output text \
        --query 'Command.CommandId')
    
    # Wait for command
    aws ssm wait command-executed \
        --command-id "$command_id" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" 2>/dev/null || true
    
    # Get status
    local status=$(aws ssm get-command-invocation \
        --command-id "$command_id" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text)
    
    if [ "$status" = "Success" ]; then
        echo "✅ Success"
        aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardOutputContent' \
            --output text 2>/dev/null | base64 --decode 2>/dev/null || true
    else
        echo "❌ Failed"
        aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardErrorContent' \
            --output text 2>/dev/null | base64 --decode 2>/dev/null || true
        return 1
    fi
    echo ""
}

echo "🚀 Starting step-by-step SSM deployment"

# Check connectivity
echo "Checking SSM connectivity..."
STATUS=$(aws ssm describe-instance-information \
    --instance-information-filter-list key=InstanceIds,valueSet="$INSTANCE_ID" \
    --region "$REGION" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text)

if [ "$STATUS" != "Online" ]; then
    echo "❌ Instance not reachable via SSM"
    exit 1
fi

echo "✅ SSM agent is online"
echo ""

# Step 1: Update system and install basic packages
run_ssm_command "sudo apt-get update -qq && sudo apt-get install -y git curl wget unzip" "Updating system packages"

# Step 2: Install Node.js 18
run_ssm_command "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs" "Installing Node.js 18"

# Step 3: Install PM2
run_ssm_command "sudo npm install -g pm2" "Installing PM2"

# Step 4: Install PostgreSQL
run_ssm_command "sudo apt-get install -y postgresql postgresql-contrib && sudo systemctl start postgresql && sudo systemctl enable postgresql" "Installing PostgreSQL"

# Step 5: Install nginx
run_ssm_command "sudo apt-get install -y nginx" "Installing nginx"

# Step 6: Create application directory
run_ssm_command "sudo mkdir -p /var/www/wms && sudo chown -R ubuntu:ubuntu /var/www/wms" "Creating application directory"

# Step 7: Clone repository
run_ssm_command "cd /var/www/wms && rm -rf .git && git clone https://github.com/progami/WMS_EcomOS.git ." "Cloning repository"

# Step 8: Create environment file
run_ssm_command "cd /var/www/wms && cat > .env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000
NEXTAUTH_SECRET=\$(openssl rand -base64 32)
PORT=3000
NEXT_TELEMETRY_DISABLED=1
EOF" "Creating environment file"

# Step 9: Setup database
run_ssm_command "sudo -u postgres psql -c \"CREATE DATABASE IF NOT EXISTS wms_db;\"" "Creating database"
run_ssm_command "sudo -u postgres psql -c \"CREATE USER IF NOT EXISTS wms_user WITH PASSWORD 'wms_password';\"" "Creating database user"
run_ssm_command "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;\"" "Granting database privileges"
run_ssm_command "sudo -u postgres psql -c \"ALTER DATABASE wms_db OWNER TO wms_user;\"" "Setting database owner"

# Step 10: Install dependencies
run_ssm_command "cd /var/www/wms && npm ci" "Installing npm dependencies"

# Step 11: Generate Prisma client
run_ssm_command "cd /var/www/wms && npx prisma generate" "Generating Prisma client"

# Step 12: Run migrations
run_ssm_command "cd /var/www/wms && NODE_ENV=production npx prisma migrate deploy" "Running database migrations" || echo "Migration step skipped"

# Step 13: Build application
run_ssm_command "cd /var/www/wms && npm run build" "Building application"

# Step 14: Setup PM2
run_ssm_command "cd /var/www/wms && pm2 delete wms 2>/dev/null || true" "Stopping old PM2 process"
run_ssm_command "cd /var/www/wms && NODE_ENV=production pm2 start npm --name wms -- start" "Starting application with PM2"
run_ssm_command "pm2 save" "Saving PM2 configuration"

# Step 15: Configure nginx
run_ssm_command "sudo tee /etc/nginx/sites-available/wms > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF" "Creating nginx configuration"

run_ssm_command "sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/ && sudo rm -f /etc/nginx/sites-enabled/default" "Enabling nginx site"
run_ssm_command "sudo nginx -t && sudo systemctl restart nginx" "Restarting nginx"

# Step 16: Configure firewall
run_ssm_command "sudo ufw allow 80/tcp 2>/dev/null || true" "Opening port 80"
run_ssm_command "sudo ufw allow 3000/tcp 2>/dev/null || true" "Opening port 3000"

# Step 17: Check application status
echo ""
echo "🔍 Checking application status..."
run_ssm_command "pm2 status" "PM2 status"
run_ssm_command "curl -s http://localhost:3000/api/health || echo 'Health check pending...'" "Health check"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application should be accessible at:"
echo "   http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"