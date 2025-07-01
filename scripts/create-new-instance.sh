#!/bin/bash

echo "🚀 Creating new EC2 instance for WMS deployment..."

REGION="us-east-1"
KEY_NAME="wms-prod"
INSTANCE_TYPE="t2.micro"

# Create user data script that will set up the instance
cat > /tmp/user-data.sh << 'EOF'
#!/bin/bash
apt-get update -y
apt-get install -y curl wget git nginx postgresql postgresql-contrib

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

# Configure Nginx
cat > /etc/nginx/sites-available/wms << 'NGINX'
server {
    listen 80;
    listen 3000;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# Install SSM agent (should be pre-installed on Ubuntu AMI)
systemctl enable amazon-ssm-agent
systemctl restart amazon-ssm-agent

echo "Initial setup completed" > /var/log/user-data.log
EOF

# Get the latest Ubuntu AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --region $REGION \
    --output text)

echo "Using AMI: $AMI_ID"

# Create new instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-groups wms-sg \
    --iam-instance-profile Name=EC2-SSM-Profile \
    --user-data file:///tmp/user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=wms-prod-new}]" \
    --region $REGION \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Created instance: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region $REGION \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance is running with IP: $PUBLIC_IP"

# Update GitHub Actions workflow with new instance ID
echo ""
echo "📝 Update the following in your GitHub Actions workflow (.github/workflows/deploy.yml):"
echo "   INSTANCE_ID=\"$INSTANCE_ID\""
echo ""
echo "🌐 Application will be accessible at:"
echo "   http://$PUBLIC_IP:3000/WMS/auth/login"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for initial setup to complete"
echo "2. Update the instance ID in your workflow"
echo "3. Run the deployment workflow again"