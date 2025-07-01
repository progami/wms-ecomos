#!/bin/bash

echo "🚀 Creating fresh EC2 instance for WMS..."

REGION="us-east-1"
KEY_NAME="wms-prod"
INSTANCE_TYPE="t2.micro"

# Terminate old instance
echo "Terminating old instance..."
aws ec2 terminate-instances --instance-ids i-0fb1f56a90fe95bac --region $REGION
aws ec2 terminate-instances --instance-ids i-0753fc7c59ec19f09 --region $REGION

# Get latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --region $REGION \
    --output text)

echo "Using AMI: $AMI_ID"

# User data script
cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash
exec > /var/log/user-data.log 2>&1
set -e

echo "Starting user data script..."

# Update system
apt-get update -y
apt-get upgrade -y

# Install dependencies
apt-get install -y curl wget git nginx postgresql postgresql-contrib build-essential

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Setup PostgreSQL
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql << SQL
CREATE DATABASE wms;
CREATE USER wmsuser WITH ENCRYPTED PASSWORD 'wmspass';
GRANT ALL PRIVILEGES ON DATABASE wms TO wmsuser;
SQL

# Create app directory
mkdir -p /var/www/wms
chown -R ubuntu:ubuntu /var/www/wms

# Install and configure SSM agent
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service

# Configure Nginx
cat > /etc/nginx/sites-available/wms << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 3000;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo "User data script completed successfully"
EOF

# Create instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-groups wms-sg \
    --iam-instance-profile Name=EC2-SSM-Profile \
    --user-data file:///tmp/user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=wms-fresh}]" \
    --region $REGION \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Created instance: $INSTANCE_ID"

# Wait for instance
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "✅ Fresh instance created!"
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo "📝 Update these values:"
echo "1. In .github/workflows/deploy.yml:"
echo "   INSTANCE_ID=\"$INSTANCE_ID\""
echo ""
echo "2. In deployment scripts:"
echo "   Application URL: http://$PUBLIC_IP:3000/WMS/auth/login"
echo ""
echo "Wait 3-5 minutes for initial setup, then run deployment."