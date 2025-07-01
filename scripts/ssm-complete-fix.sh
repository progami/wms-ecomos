#!/bin/bash

# Complete fix for WMS deployment - addresses all potential issues

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🔧 Running complete WMS deployment fix"
echo "This will ensure everything is properly configured"
echo ""

# First, let's check what's wrong
echo "📋 Checking current state..."
CHECK_CMD=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --parameters 'commands=["pm2 list","echo ---","ps aux | grep node | grep -v grep","echo ---","sudo netstat -tlnp | grep -E \":80|:3000\""]' \
    --output text \
    --query 'Command.CommandId')

sleep 5

echo "Current state:"
aws ssm get-command-invocation \
    --command-id "$CHECK_CMD" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'StandardOutputContent' \
    --output text 2>/dev/null | base64 -d 2>/dev/null || echo "No output"

echo ""
echo "🚀 Applying comprehensive fix..."

# Run the complete fix
FIX_CMD=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --timeout-seconds 600 \
    --parameters '{
        "commands": [
            "#!/bin/bash",
            "set -x",
            "",
            "# Stop everything first",
            "pm2 kill || true",
            "sudo pkill -f node || true",
            "",
            "# Ensure we are in the right directory",
            "cd /var/www/wms",
            "",
            "# Check if the application files exist",
            "if [ ! -f \"package.json\" ]; then",
            "    echo \"Application files missing, cloning repository...\"",
            "    sudo rm -rf /var/www/wms/*",
            "    git clone https://github.com/progami/WMS_EcomOS.git .",
            "fi",
            "",
            "# Ensure proper ownership",
            "sudo chown -R ubuntu:ubuntu /var/www/wms",
            "",
            "# Create proper environment file",
            "cat > .env.production << '\''ENV'\''",
            "NODE_ENV=production",
            "DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db",
            "NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000",
            "NEXTAUTH_SECRET=temporary-secret-for-testing",
            "PORT=3000",
            "NEXT_TELEMETRY_DISABLED=1",
            "ENV",
            "",
            "# Ensure PostgreSQL is properly configured",
            "sudo systemctl restart postgresql",
            "sleep 2",
            "",
            "# Recreate database",
            "sudo -u postgres psql << '\''SQL'\''",
            "DROP DATABASE IF EXISTS wms_db;",
            "CREATE DATABASE wms_db;",
            "DROP USER IF EXISTS wms_user;", 
            "CREATE USER wms_user WITH PASSWORD '\''wms_password'\'';",
            "GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;",
            "ALTER DATABASE wms_db OWNER TO wms_user;",
            "SQL",
            "",
            "# Clean install dependencies",
            "rm -rf node_modules",
            "npm ci",
            "",
            "# Generate Prisma client",
            "npx prisma generate",
            "",
            "# Push schema to database",
            "NODE_ENV=production npx prisma db push --accept-data-loss",
            "",
            "# Build the application",
            "rm -rf .next",
            "npm run build",
            "",
            "# Start with PM2 using explicit configuration",
            "NODE_ENV=production PORT=3000 pm2 start npm --name wms -- start",
            "pm2 save",
            "",
            "# Ensure PM2 starts on boot",
            "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu",
            "pm2 save",
            "",
            "# Fix nginx configuration",
            "sudo tee /etc/nginx/sites-available/wms << '\''NGINX'\''",
            "server {",
            "    listen 80;",
            "    server_name _;",
            "    ",
            "    location / {",
            "        proxy_pass http://127.0.0.1:3000;",
            "        proxy_http_version 1.1;",
            "        proxy_set_header Upgrade \\$http_upgrade;",
            "        proxy_set_header Connection '\''upgrade'\'';",
            "        proxy_set_header Host \\$host;",
            "        proxy_set_header X-Real-IP \\$remote_addr;",
            "        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;",
            "        proxy_set_header X-Forwarded-Proto \\$scheme;",
            "    }",
            "}",
            "NGINX",
            "",
            "sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/",
            "sudo rm -f /etc/nginx/sites-enabled/default",
            "sudo nginx -t && sudo systemctl restart nginx",
            "",
            "# Wait for application to start",
            "echo \"Waiting for application to start...\"",
            "sleep 20",
            "",
            "# Final status check",
            "echo \"\"",
            "echo \"=== Final Status ===\"",
            "pm2 status",
            "echo \"\"",
            "echo \"Port listeners:\"",
            "sudo netstat -tlnp | grep -E \":80|:3000\"",
            "echo \"\"",
            "echo \"Testing endpoints:\"",
            "curl -s http://localhost:3000 | head -5 || echo \"Port 3000 not responding\"",
            "echo \"\"",
            "curl -s http://localhost | head -5 || echo \"Port 80 not responding\"",
            "echo \"\"",
            "echo \"PM2 logs:\"",
            "pm2 logs wms --lines 20 --nostream"
        ]
    }' \
    --output text \
    --query 'Command.CommandId')

echo "Fix command ID: $FIX_CMD"
echo "⏳ Waiting for fix to complete (this will take several minutes)..."

# Monitor progress
attempts=0
while [ $attempts -lt 60 ]; do
    sleep 10
    
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$FIX_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'Status' \
        --output text 2>/dev/null || echo "InProgress")
    
    if [ "$STATUS" != "InProgress" ]; then
        break
    fi
    
    attempts=$((attempts + 1))
    if [ $((attempts % 3)) -eq 0 ]; then
        echo "Still running... ($((attempts * 10)) seconds elapsed)"
    fi
done

echo ""
echo "Fix status: $STATUS"

if [ "$STATUS" = "Success" ]; then
    echo "✅ Fix completed successfully!"
    echo ""
    echo "Getting last output..."
    
    # Get the last part of the output
    OUTPUT_CMD=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --region "$REGION" \
        --parameters 'commands=["tail -100 /var/log/cloud-init-output.log | grep -E \"(Final Status|Port listeners|Testing endpoints|PM2)\" || echo \"No relevant logs\""]' \
        --output text \
        --query 'Command.CommandId')
    
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id "$OUTPUT_CMD" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null || echo "Could not get output"
else
    echo "❌ Fix failed!"
fi

echo ""
echo "🔍 Final connectivity test:"
echo ""

# Test from outside
echo -n "Testing port 3000: "
HTTP_3000=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://ec2-54-221-58-217.compute-1.amazonaws.com:3000 2>/dev/null || echo "000")
if [ "$HTTP_3000" = "200" ]; then
    echo "✅ Success (HTTP $HTTP_3000)"
    echo "Application is accessible at: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
else
    echo "❌ Failed (HTTP $HTTP_3000)"
fi

echo -n "Testing port 80: "
HTTP_80=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://ec2-54-221-58-217.compute-1.amazonaws.com 2>/dev/null || echo "000")
if [ "$HTTP_80" = "200" ]; then
    echo "✅ Success (HTTP $HTTP_80)"
    echo "Application is accessible at: http://ec2-54-221-58-217.compute-1.amazonaws.com"
else
    echo "❌ Failed (HTTP $HTTP_80)"
fi

echo ""
echo "📝 Summary:"
echo "- Fix command ID: $FIX_CMD"
echo "- Instance ID: $INSTANCE_ID"
echo ""

if [ "$HTTP_3000" = "200" ] || [ "$HTTP_80" = "200" ]; then
    echo "✅ WMS application is now running!"
    echo ""
    echo "Access the application at:"
    echo "- http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
    echo "- http://ec2-54-221-58-217.compute-1.amazonaws.com"
else
    echo "❌ Application is still not accessible"
    echo ""
    echo "To investigate further, run:"
    echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 100\"]' --region $REGION"
fi