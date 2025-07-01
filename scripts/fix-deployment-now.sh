#!/bin/bash

echo "🔧 Fixing WMS deployment on EC2..."

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

# Step 1: Check instance and restart SSM agent if needed
echo "Step 1: Restarting SSM agent on EC2..."
aws ec2 reboot-instances --instance-ids $INSTANCE_ID --region $REGION

echo "Waiting 60 seconds for instance to reboot..."
sleep 60

# Step 2: Wait for SSM agent to come online
echo "Step 2: Waiting for SSM agent..."
for i in {1..20}; do
    SSM_STATUS=$(aws ssm describe-instance-information \
        --instance-information-filter-list key=InstanceIds,valueSet=$INSTANCE_ID \
        --region $REGION \
        --query 'InstanceInformationList[0].PingStatus' \
        --output text 2>/dev/null || echo "offline")
    
    if [ "$SSM_STATUS" = "Online" ]; then
        echo "✅ SSM agent is online"
        break
    else
        echo "Attempt $i/20: SSM status: $SSM_STATUS"
        sleep 10
    fi
done

if [ "$SSM_STATUS" != "Online" ]; then
    echo "❌ SSM agent failed to come online. Please check the instance manually."
    exit 1
fi

# Step 3: Setup application directories
echo "Step 3: Setting up application directories..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "sudo mkdir -p /var/www/wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms",
        "cd /var/www/wms",
        "sudo apt-get update -y",
        "sudo apt-get install -y git curl nginx postgresql postgresql-contrib",
        "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
        "sudo apt-get install -y nodejs",
        "sudo npm install -g pm2",
        "sudo systemctl start postgresql",
        "sudo systemctl enable postgresql"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Setup command: $CMD_ID"
sleep 20

# Step 4: Clone and setup application
echo "Step 4: Cloning application..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www",
        "sudo rm -rf wms",
        "sudo git clone https://github.com/progami/WMS_EcomOS.git wms",
        "sudo chown -R ubuntu:ubuntu /var/www/wms",
        "cd /var/www/wms",
        "npm install"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Clone command: $CMD_ID"
echo "Waiting for npm install (this may take several minutes)..."
sleep 180

# Step 5: Setup database
echo "Step 5: Setting up database..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "sudo -u postgres psql -c \"CREATE DATABASE wms;\"",
        "sudo -u postgres psql -c \"CREATE USER wmsuser WITH ENCRYPTED PASSWORD '\''wmspass'\'';\"",
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE wms TO wmsuser;\"",
        "cd /var/www/wms",
        "echo \"DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms\" > .env.local",
        "echo \"NEXTAUTH_SECRET=your-secret-key-here\" >> .env.local",
        "echo \"NEXTAUTH_URL=http://54.243.188.216:3000\" >> .env.local",
        "export DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms",
        "npx prisma generate",
        "npx prisma migrate deploy || true"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Database command: $CMD_ID"
sleep 30

# Step 6: Build application
echo "Step 6: Building application..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www/wms",
        "export DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms",
        "export NEXTAUTH_SECRET=your-secret-key-here",
        "export NEXTAUTH_URL=http://54.243.188.216:3000",
        "npm run build"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Build command: $CMD_ID"
echo "Waiting for build to complete (this may take several minutes)..."
sleep 180

# Step 7: Setup Nginx
echo "Step 7: Configuring Nginx..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "sudo tee /etc/nginx/sites-available/wms << EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection '\''upgrade'\'';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF",
        "sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t",
        "sudo systemctl restart nginx"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Nginx command: $CMD_ID"
sleep 20

# Step 8: Start application with PM2
echo "Step 8: Starting application with PM2..."
CMD_ID=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cd /var/www/wms",
        "pm2 delete all || true",
        "export DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms",
        "export NEXTAUTH_SECRET=your-secret-key-here",
        "export NEXTAUTH_URL=http://54.243.188.216:3000",
        "pm2 start npm --name wms -- start",
        "pm2 save",
        "pm2 startup systemd -u ubuntu --hp /home/ubuntu || true",
        "pm2 status"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "PM2 command: $CMD_ID"
sleep 30

# Final check
echo ""
echo "🔍 Checking deployment status..."
STATUS_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "pm2 status",
        "curl -s http://localhost:3000 | head -20",
        "systemctl status nginx | head -10"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

sleep 10

echo ""
echo "Getting status output..."
aws ssm get-command-invocation \
    --command-id $STATUS_CMD \
    --instance-id $INSTANCE_ID \
    --region $REGION \
    --query 'StandardOutputContent' \
    --output text

echo ""
echo "✅ Deployment fix completed!"
echo "🌐 Application should be accessible at: http://54.243.188.216:3000/WMS/auth/login"
echo ""
echo "If the app is not accessible, wait a few more minutes for it to fully start."