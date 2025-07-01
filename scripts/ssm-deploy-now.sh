#!/bin/bash

# Immediate deployment script using SSM
# This script deploys WMS application right now without waiting for GitHub Actions

set -euo pipefail

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🚀 Starting immediate SSM deployment to instance: $INSTANCE_ID"

# Check SSM connectivity
echo "Checking SSM agent status..."
STATUS=$(aws ssm describe-instance-information \
    --instance-information-filter-list key=InstanceIds,valueSet="$INSTANCE_ID" \
    --region "$REGION" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null || echo "NotFound")

if [ "$STATUS" != "Online" ]; then
    echo "❌ Instance is not reachable via SSM (Status: $STATUS)"
    exit 1
fi

echo "✅ SSM agent is online"

# Create and execute deployment commands
echo "📦 Deploying WMS application..."

COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=[
        "#!/bin/bash",
        "set -euo pipefail",
        "",
        "echo \"Starting WMS deployment at $(date)\"",
        "",
        "# Install required packages",
        "echo \"Installing required packages...\"",
        "sudo apt-get update -qq",
        "sudo apt-get install -y git nodejs npm postgresql postgresql-contrib nginx",
        "",
        "# Install Node.js 18 if needed",
        "if ! node --version | grep -q \"v18\"; then",
        "    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
        "    sudo apt-get install -y nodejs",
        "fi",
        "",
        "# Install PM2",
        "sudo npm install -g pm2",
        "",
        "# Create app directory",
        "sudo mkdir -p /var/www/wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms",
        "",
        "# Clone/update repository",
        "cd /var/www/wms",
        "if [ -d \".git\" ]; then",
        "    git fetch origin",
        "    git reset --hard origin/main",
        "else",
        "    git clone https://github.com/progami/WMS_EcomOS.git .",
        "fi",
        "",
        "# Create environment file",
        "cat > .env.production << '\''EOF'\''",
        "NODE_ENV=production",
        "DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db",
        "NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000",
        "NEXTAUTH_SECRET=$(openssl rand -base64 32)",
        "PORT=3000",
        "NEXT_TELEMETRY_DISABLED=1",
        "EOF",
        "",
        "# Setup PostgreSQL",
        "sudo systemctl start postgresql",
        "sudo systemctl enable postgresql",
        "sudo -u postgres psql -c \"CREATE DATABASE IF NOT EXISTS wms_db;\" || true",
        "sudo -u postgres psql -c \"CREATE USER IF NOT EXISTS wms_user WITH PASSWORD '\''wms_password'\'';\" || true",
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;\" || true",
        "sudo -u postgres psql -c \"ALTER DATABASE wms_db OWNER TO wms_user;\" || true",
        "",
        "# Install dependencies and build",
        "npm ci",
        "npx prisma generate",
        "NODE_ENV=production npx prisma migrate deploy || true",
        "npm run build",
        "",
        "# Configure PM2",
        "pm2 delete wms 2>/dev/null || true",
        "NODE_ENV=production pm2 start npm --name wms -- start",
        "pm2 save",
        "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true",
        "",
        "# Configure nginx",
        "sudo tee /etc/nginx/sites-available/wms > /dev/null << '\''NGINX'\''",
        "server {",
        "    listen 80;",
        "    server_name _;",
        "    ",
        "    location / {",
        "        proxy_pass http://localhost:3000;",
        "        proxy_http_version 1.1;",
        "        proxy_set_header Upgrade \\$http_upgrade;",
        "        proxy_set_header Connection '\''upgrade'\'';",
        "        proxy_set_header Host \\$host;",
        "        proxy_set_header X-Real-IP \\$remote_addr;",
        "        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;",
        "        proxy_set_header X-Forwarded-Proto \\$scheme;",
        "        proxy_cache_bypass \\$http_upgrade;",
        "    }",
        "}",
        "NGINX",
        "",
        "sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t && sudo systemctl restart nginx",
        "",
        "# Open firewall ports",
        "sudo ufw allow 80/tcp 2>/dev/null || true",
        "sudo ufw allow 3000/tcp 2>/dev/null || true",
        "",
        "# Health check",
        "sleep 10",
        "echo \"Deployment complete. Checking health...\"",
        "curl -s http://localhost:3000/api/health || echo \"Application starting...\"",
        "pm2 status",
        "",
        "echo \"Deployment finished at $(date)\""
    ]' \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "⏳ Waiting for deployment to complete (this may take 5-10 minutes)..."

# Monitor command execution
attempts=0
max_attempts=120  # 10 minutes timeout

while [ $attempts -lt $max_attempts ]; do
    sleep 5
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    echo -n "."
    attempts=$((attempts + 1))
done

echo ""

# Get results
if [ "$STATUS" = "Success" ]; then
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📋 Deployment output:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text | base64 --decode || true
else
    echo "❌ Deployment failed with status: $STATUS"
    echo ""
    echo "📋 Error output:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text | base64 --decode || true
    exit 1
fi

echo ""
echo "🌐 Application should be accessible at:"
echo "   http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
echo ""
echo "To check application status, run:"
echo "   aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 status\",\"curl -s http://localhost:3000/api/health\"]' --region $REGION"