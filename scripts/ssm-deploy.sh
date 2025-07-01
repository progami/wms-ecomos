#!/bin/bash

# SSM-based deployment script for WMS application
# This script deploys the WMS application to EC2 using AWS Systems Manager

set -euo pipefail

# Configuration
INSTANCE_ID="${INSTANCE_ID:-i-0fb1f56a90fe95bac}"
REGION="${AWS_REGION:-us-east-1}"
APP_NAME="wms"
APP_DIR="/var/www/wms"
GITHUB_REPO="https://github.com/progami/WMS_EcomOS.git"
BRANCH="${BRANCH:-main}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to execute command via SSM
execute_ssm_command() {
    local command="$1"
    local description="$2"
    
    print_status "Executing: $description"
    
    local command_id=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[$command]" \
        --region "$REGION" \
        --output text \
        --query 'Command.CommandId')
    
    if [ -z "$command_id" ]; then
        print_error "Failed to get command ID"
        return 1
    fi
    
    print_status "Command ID: $command_id"
    
    # Wait for command to complete
    local status="InProgress"
    local attempts=0
    local max_attempts=60  # 5 minutes timeout
    
    while [ "$status" = "InProgress" ] && [ $attempts -lt $max_attempts ]; do
        sleep 5
        status=$(aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --output text \
            --query 'Status' 2>/dev/null || echo "InProgress")
        attempts=$((attempts + 1))
        echo -n "."
    done
    echo
    
    # Get command output
    if [ "$status" = "Success" ]; then
        print_status "Command completed successfully"
        aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardOutputContent' \
            --output text | base64 --decode 2>/dev/null || true
    else
        print_error "Command failed with status: $status"
        aws ssm get-command-invocation \
            --command-id "$command_id" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query 'StandardErrorContent' \
            --output text | base64 --decode 2>/dev/null || true
        return 1
    fi
}

# Main deployment function
main() {
    print_status "Starting SSM-based deployment to instance: $INSTANCE_ID"
    
    # Check if instance is reachable via SSM
    print_status "Checking SSM connectivity..."
    aws ssm describe-instance-information \
        --instance-information-filter-list key=InstanceIds,valueSet="$INSTANCE_ID" \
        --region "$REGION" \
        --query 'InstanceInformationList[0].PingStatus' \
        --output text | grep -q "Online" || {
        print_error "Instance is not reachable via SSM"
        exit 1
    }
    
    # Create deployment script on the instance
    print_status "Creating deployment script on instance..."
    
    local deploy_script='#!/bin/bash
set -euo pipefail

# Setup colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${GREEN}Starting WMS deployment...${NC}"

# Install required packages
echo -e "${GREEN}Installing required packages...${NC}"
sudo apt-get update
sudo apt-get install -y git nodejs npm postgresql-client unzip

# Install PM2 globally
echo -e "${GREEN}Installing PM2...${NC}"
sudo npm install -g pm2

# Create application directory
echo -e "${GREEN}Creating application directory...${NC}"
sudo mkdir -p /var/www/wms
sudo chown -R ubuntu:ubuntu /var/www/wms

# Clone or update repository
echo -e "${GREEN}Cloning/updating repository...${NC}"
cd /var/www/wms
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    git clone https://github.com/progami/WMS_EcomOS.git .
fi

# Create environment file
echo -e "${GREEN}Creating environment configuration...${NC}"
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
PORT=3000
EOF

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm ci

# Generate Prisma client
echo -e "${GREEN}Generating Prisma client...${NC}"
npx prisma generate

# Setup PostgreSQL database
echo -e "${GREEN}Setting up PostgreSQL database...${NC}"
sudo -u postgres psql << EOSQL
CREATE DATABASE IF NOT EXISTS wms_db;
CREATE USER IF NOT EXISTS wms_user WITH PASSWORD "wms_password";
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
ALTER DATABASE wms_db OWNER TO wms_user;
EOSQL

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
NODE_ENV=production npx prisma migrate deploy || true

# Build the application
echo -e "${GREEN}Building application...${NC}"
npm run build

# Start/restart application with PM2
echo -e "${GREEN}Starting application with PM2...${NC}"
pm2 delete wms || true
NODE_ENV=production pm2 start npm --name wms -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

# Setup nginx (if not already configured)
if ! command -v nginx &> /dev/null; then
    echo -e "${GREEN}Installing and configuring nginx...${NC}"
    sudo apt-get install -y nginx
    
    sudo tee /etc/nginx/sites-available/wms << EONGINX
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EONGINX
    
    sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
fi

# Configure firewall
echo -e "${GREEN}Configuring firewall...${NC}"
sudo ufw allow 80/tcp || true
sudo ufw allow 3000/tcp || true

# Check application status
echo -e "${GREEN}Checking application status...${NC}"
pm2 status
curl -s http://localhost:3000/api/health || echo "Health check pending..."

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${YELLOW}Application should be accessible at:${NC}"
echo -e "${GREEN}http://ec2-54-221-58-217.compute-1.amazonaws.com:3000${NC}"
'
    
    # Create the deployment script on the instance
    execute_ssm_command "echo '$deploy_script' | base64 -d > /tmp/deploy-wms.sh && chmod +x /tmp/deploy-wms.sh" "Creating deployment script"
    
    # Execute the deployment script
    execute_ssm_command "sudo -i bash /tmp/deploy-wms.sh 2>&1" "Executing deployment"
    
    # Verify deployment
    print_status "Verifying deployment..."
    execute_ssm_command "pm2 status && curl -s http://localhost:3000/api/health | jq . || echo 'Application starting...'" "Checking application status"
    
    print_status "Deployment completed!"
    print_status "Application should be accessible at: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000"
}

# Run main function
main "$@"