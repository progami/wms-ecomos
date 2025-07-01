#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <INSTANCE_ID>"
    exit 1
fi

INSTANCE_ID=$1
REGION="us-east-1"
DEPLOYMENT_FILE="wms-deployment-minimal.tar.gz"

echo "🚀 Deploying WMS to instance $INSTANCE_ID..."

# Get instance IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance IP: $PUBLIC_IP"

# Check SSM agent status
echo "Checking SSM agent..."
SSM_STATUS=$(aws ssm describe-instance-information \
    --instance-information-filter-list key=InstanceIds,valueSet=$INSTANCE_ID \
    --region $REGION \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null || echo "offline")

if [ "$SSM_STATUS" != "Online" ]; then
    echo "❌ SSM agent is not online yet. Please wait and try again."
    exit 1
fi

echo "✅ SSM agent is online"

# Setup instance
echo "Setting up instance..."
SETUP_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 600 \
    --parameters 'commands=[
        "apt-get update -y",
        "apt-get install -y curl wget git nginx postgresql postgresql-contrib build-essential",
        "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
        "apt-get install -y nodejs",
        "npm install -g pm2",
        "systemctl start postgresql",
        "systemctl enable postgresql",
        "sudo -u postgres psql -c \"CREATE DATABASE wms;\" || true",
        "sudo -u postgres psql -c \"CREATE USER wmsuser WITH ENCRYPTED PASSWORD '\''wmspass'\'';\" || true",
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE wms TO wmsuser;\" || true",
        "mkdir -p /var/www/wms",
        "chown -R ubuntu:ubuntu /var/www/wms"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Setup command: $SETUP_CMD"
echo "Waiting for setup to complete (this may take a few minutes)..."
sleep 60

# Configure Nginx
echo "Configuring Nginx..."
NGINX_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=[
        "cat > /etc/nginx/sites-available/wms << '\''EOF'\''
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
    }
}
EOF",
        "ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/",
        "rm -f /etc/nginx/sites-enabled/default",
        "nginx -t",
        "systemctl restart nginx"
    ]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Nginx command: $NGINX_CMD"
sleep 20

# Create S3 bucket for deployment
TIMESTAMP=$(date +%s)
BUCKET_NAME="wms-deploy-${TIMESTAMP}"

echo "Creating deployment bucket..."
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Upload deployment package
echo "Uploading deployment package..."
aws s3 cp $DEPLOYMENT_FILE s3://$BUCKET_NAME/deploy.tar.gz

# Generate presigned URL
DOWNLOAD_URL=$(aws s3 presign s3://$BUCKET_NAME/deploy.tar.gz --expires-in 3600)

# Deploy application
echo "Deploying application..."
DEPLOY_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 900 \
    --parameters "commands=[
        'cd /var/www/wms',
        'wget -O deploy.tar.gz \"$DOWNLOAD_URL\"',
        'tar -xzf deploy.tar.gz',
        'rm deploy.tar.gz',
        'npm ci --production',
        'cp .env.production .env',
        'sed -i \"s|DATABASE_URL=.*|DATABASE_URL=postgresql://wmsuser:wmspass@localhost:5432/wms|\" .env',
        'sed -i \"s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$PUBLIC_IP:3000|\" .env',
        'npx prisma generate',
        'npx prisma migrate deploy || true',
        'pm2 delete all || true',
        'pm2 start npm --name wms -- start',
        'pm2 save',
        'pm2 startup systemd -u ubuntu --hp /home/ubuntu || true'
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId')

echo "Deploy command: $DEPLOY_CMD"
echo "Waiting for deployment (this will take several minutes)..."

# Monitor deployment
for i in {1..30}; do
    sleep 10
    STATUS=$(aws ssm get-command-invocation \
        --command-id $DEPLOY_CMD \
        --instance-id $INSTANCE_ID \
        --query 'Status' \
        --output text 2>/dev/null || echo "waiting")
    
    echo "Status: $STATUS (attempt $i/30)"
    
    if [ "$STATUS" = "Success" ]; then
        echo "✅ Deployment successful!"
        break
    elif [ "$STATUS" = "Failed" ]; then
        echo "❌ Deployment failed!"
        aws ssm get-command-invocation \
            --command-id $DEPLOY_CMD \
            --instance-id $INSTANCE_ID \
            --query 'StandardErrorContent' \
            --output text
        break
    fi
done

# Cleanup S3
echo "Cleaning up..."
aws s3 rm s3://$BUCKET_NAME/deploy.tar.gz
aws s3 rb s3://$BUCKET_NAME

# Final status check
echo ""
echo "Checking application status..."
STATUS_CMD=$(aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 status","curl -s http://localhost:3000 | grep -o \"<title>[^<]*</title>\" | head -1"]' \
    --region $REGION \
    --output text --query 'Command.CommandId')

sleep 10

aws ssm get-command-invocation \
    --command-id $STATUS_CMD \
    --instance-id $INSTANCE_ID \
    --region $REGION \
    --query 'StandardOutputContent' \
    --output text

echo ""
echo "✅ Deployment complete!"
echo "🌐 Application URL: http://$PUBLIC_IP:3000/WMS/auth/login"
echo ""
echo "📝 Update .github/workflows/deploy.yml with:"
echo "   INSTANCE_ID=\"$INSTANCE_ID\""