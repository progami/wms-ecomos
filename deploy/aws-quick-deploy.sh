#!/bin/bash

# AWS Free Tier Quick Deployment Script
# This script helps set up WMS on an AWS EC2 instance

set -e

echo "================================"
echo "WMS AWS Deployment Setup"
echo "================================"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}This script is designed for Ubuntu. Please use Ubuntu 22.04 LTS.${NC}"
    exit 1
fi

# Step 1: System Updates
echo -e "\n${GREEN}Step 1: Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

# Step 2: Install Node.js 18.x
echo -e "\n${GREEN}Step 2: Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Step 3: Install required packages
echo -e "\n${GREEN}Step 3: Installing required packages...${NC}"
sudo apt install -y nginx postgresql-client git build-essential

# Step 4: Install PM2 globally
echo -e "\n${GREEN}Step 4: Installing PM2...${NC}"
sudo npm install -g pm2

# Step 5: Create application directory
echo -e "\n${GREEN}Step 5: Setting up application directory...${NC}"
sudo mkdir -p /var/www/wms
sudo chown -R $USER:$USER /var/www/wms

# Step 6: Clone repository
echo -e "\n${GREEN}Step 6: Cloning repository...${NC}"
cd /var/www
if [ -d "wms/.git" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd wms
    git pull origin main
else
    echo "Enter your Git repository URL:"
    read -r GIT_REPO
    git clone $GIT_REPO wms
    cd wms
fi

# Step 7: Install dependencies
echo -e "\n${GREEN}Step 7: Installing dependencies...${NC}"
npm install --production=false

# Step 8: Set up environment file
echo -e "\n${GREEN}Step 8: Setting up environment configuration...${NC}"
if [ ! -f .env.production ]; then
    cat > .env.production << 'EOF'
# Production Environment Variables
NODE_ENV=production

# Database - Update with your RDS endpoint
DATABASE_URL=postgresql://wms_admin:YOUR_PASSWORD@your-rds-endpoint.amazonaws.com:5432/wms_production

# NextAuth - Generate secret with: openssl rand -base64 32
NEXTAUTH_URL=https://targongglobal.com/wms
NEXTAUTH_SECRET=your-generated-secret-here

# Application
NEXT_PUBLIC_APP_URL=https://targongglobal.com/wms
PORT=3000

# Authentication - Set strong passwords
DEMO_ADMIN_PASSWORD=your-strong-admin-password
DEMO_STAFF_PASSWORD=your-strong-staff-password

# Logging
LOG_LEVEL=info
LOG_DIR=/var/www/wms/logs

# AWS (Optional - for backups)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# S3_BACKUP_BUCKET=wms-backups
EOF
    
    echo -e "${YELLOW}Please edit .env.production with your actual values:${NC}"
    echo "1. Update DATABASE_URL with your RDS endpoint"
    echo "2. Generate NEXTAUTH_SECRET: openssl rand -base64 32"
    echo "3. Set strong passwords for DEMO_ADMIN_PASSWORD and DEMO_STAFF_PASSWORD"
    echo ""
    read -p "Press Enter to continue after editing .env.production..."
    nano .env.production
fi

# Step 9: Build application
echo -e "\n${GREEN}Step 9: Building application...${NC}"
npm run build:prod

# Step 10: Set up PM2
echo -e "\n${GREEN}Step 10: Setting up PM2...${NC}"
pm2 start ecosystem.config.js --name wms-production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Step 11: Configure Nginx
echo -e "\n${GREEN}Step 11: Configuring Nginx...${NC}"
sudo cp deploy/nginx-wms.conf /etc/nginx/sites-available/wms

# Update server_name in nginx config
echo -e "${YELLOW}Enter your domain name (e.g., targongglobal.com):${NC}"
read -r DOMAIN_NAME
sudo sed -i "s/your-domain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/wms

sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo -e "${GREEN}Nginx configured successfully!${NC}"
else
    echo -e "${RED}Nginx configuration failed. Please check the configuration.${NC}"
    exit 1
fi

# Step 12: Set up SSL with Let's Encrypt
echo -e "\n${GREEN}Step 12: Setting up SSL certificate...${NC}"
echo -e "${YELLOW}Do you want to set up SSL with Let's Encrypt? (y/n)${NC}"
read -r SETUP_SSL

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
fi

# Step 13: Set up firewall
echo -e "\n${GREEN}Step 13: Configuring firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# Step 14: Set up automated backups
echo -e "\n${GREEN}Step 14: Setting up automated backups...${NC}"
cd /var/www/wms/scripts/production
chmod +x backup-database.sh setup-auto-backup.sh
./setup-auto-backup.sh

# Step 15: Create helpful scripts
echo -e "\n${GREEN}Step 15: Creating management scripts...${NC}"
cat > ~/update-wms.sh << 'EOF'
#!/bin/bash
cd /var/www/wms
git pull origin main
npm install --production=false
npm run build:prod
pm2 restart wms-production
EOF
chmod +x ~/update-wms.sh

cat > ~/wms-logs.sh << 'EOF'
#!/bin/bash
pm2 logs wms-production --lines 100
EOF
chmod +x ~/wms-logs.sh

# Final setup
echo -e "\n${GREEN}Deployment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your DNS to point to this server's IP address"
echo "2. Ensure your RDS database is accessible from this instance"
echo "3. Run database migrations: cd /var/www/wms && npm run db:push"
echo ""
echo "Useful commands:"
echo "- View logs: ~/wms-logs.sh"
echo "- Update app: ~/update-wms.sh"
echo "- PM2 status: pm2 status"
echo "- PM2 monitoring: pm2 monit"
echo ""
echo "Your application should be accessible at:"
echo "http://$DOMAIN_NAME/wms (or https:// if SSL is configured)"
echo ""
echo -e "${YELLOW}Remember to configure your RDS security group to allow connections from this EC2 instance!${NC}"