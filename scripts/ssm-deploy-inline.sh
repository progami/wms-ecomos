#!/bin/bash

# Inline SSM deployment - sends all commands in one go

set -euo pipefail

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🚀 Starting inline SSM deployment to $INSTANCE_ID"

# Check SSM connectivity first
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

# Send complete deployment command
echo "📦 Deploying WMS application..."

COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --timeout-seconds 900 \
    --parameters '{
        "commands": [
            "#!/bin/bash",
            "set -x",
            "echo \"=== WMS Deployment Starting ===\"",
            "echo \"Time: $(date)\"",
            "",
            "# Update system",
            "sudo apt-get update -y",
            "",
            "# Install Node.js 18",
            "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
            "sudo apt-get install -y nodejs git build-essential",
            "",
            "# Install PM2",
            "sudo npm install -g pm2",
            "",
            "# Install PostgreSQL",
            "sudo apt-get install -y postgresql postgresql-contrib",
            "sudo systemctl start postgresql",
            "sudo systemctl enable postgresql",
            "",
            "# Install nginx", 
            "sudo apt-get install -y nginx",
            "",
            "# Create app directory",
            "sudo mkdir -p /var/www/wms",
            "sudo chown -R ubuntu:ubuntu /var/www/wms",
            "",
            "# Clone repository",
            "cd /var/www/wms",
            "rm -rf * .*",
            "git clone https://github.com/progami/WMS_EcomOS.git .",
            "",
            "# Create .env.production",
            "cat > .env.production << '\''EOF'\''",
            "NODE_ENV=production",
            "DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db",
            "NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000",
            "NEXTAUTH_SECRET=change-this-secret-in-production",
            "PORT=3000",
            "NEXT_TELEMETRY_DISABLED=1",
            "EOF",
            "",
            "# Setup database",
            "sudo -u postgres createdb wms_db || true",
            "sudo -u postgres psql -c \"CREATE USER wms_user WITH PASSWORD '\''wms_password'\'';\" || true",
            "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;\" || true",
            "",
            "# Install dependencies",
            "npm ci",
            "",
            "# Generate Prisma",
            "npx prisma generate",
            "",
            "# Run migrations",
            "NODE_ENV=production npx prisma migrate deploy || true",
            "",
            "# Build app",
            "npm run build",
            "",
            "# Start with PM2",
            "pm2 delete wms || true",
            "NODE_ENV=production pm2 start npm --name wms -- start",
            "pm2 save",
            "",
            "# Configure nginx",
            "sudo tee /etc/nginx/sites-available/wms > /dev/null << '\''NGINX'\''",
            "server {",
            "    listen 80;",
            "    server_name _;",
            "    location / {",
            "        proxy_pass http://localhost:3000;",
            "        proxy_http_version 1.1;",
            "        proxy_set_header Upgrade \\$http_upgrade;",
            "        proxy_set_header Connection '\''upgrade'\'';",
            "        proxy_set_header Host \\$host;",
            "        proxy_cache_bypass \\$http_upgrade;",
            "    }",
            "}",
            "NGINX",
            "",
            "sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/",
            "sudo rm -f /etc/nginx/sites-enabled/default",
            "sudo systemctl restart nginx",
            "",
            "# Open ports",
            "sudo ufw allow 80/tcp || true",
            "sudo ufw allow 3000/tcp || true",
            "",
            "echo \"=== Deployment Complete ===\"",
            "pm2 status",
            "curl -s http://localhost:3000/api/health || echo '\''Starting...'\''",
            "echo \"URL: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000\""
        ],
        "workingDirectory": ["/home/ubuntu"],
        "executionTimeout": ["900"]
    }' \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "⏳ Waiting for deployment (this will take 5-10 minutes)..."

# Monitor progress
attempts=0
while [ $attempts -lt 60 ]; do
    sleep 10
    
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    attempts=$((attempts + 1))
    echo -n "."
done

echo ""
echo "Final status: $STATUS"

# Get output
if [ "$STATUS" = "Success" ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Output:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text | base64 -d 2>/dev/null | tail -50
else
    echo "❌ Deployment failed!"
    echo ""
    echo "📋 Error:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text | base64 -d 2>/dev/null || echo "No error output"
fi

echo ""
echo "🌐 Application URL: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"