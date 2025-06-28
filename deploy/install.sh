#!/bin/bash
# WMS EC2 Instance Setup Script
# This script sets up a fresh Ubuntu 22.04 EC2 instance for WMS deployment

set -e  # Exit on error

echo "🚀 Starting WMS EC2 Setup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo -e "${YELLOW}🔧 Installing essential packages...${NC}"
sudo apt install -y curl wget git build-essential

# Install Node.js 18.x
echo -e "${YELLOW}📗 Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node -v)
echo -e "${GREEN}✅ Node.js installed: $node_version${NC}"

# Install PostgreSQL 15
echo -e "${YELLOW}🐘 Installing PostgreSQL 15...${NC}"
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Install Nginx
echo -e "${YELLOW}🌐 Installing Nginx...${NC}"
sudo apt install -y nginx

# Install PM2 globally
echo -e "${YELLOW}🔄 Installing PM2 process manager...${NC}"
sudo npm install -g pm2

# Install Certbot for SSL (we'll use it later when domain is ready)
echo -e "${YELLOW}🔒 Installing Certbot...${NC}"
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /var/www/wms
sudo chown ubuntu:ubuntu /var/www/wms

# Create log directories
sudo mkdir -p /var/log/wms
sudo mkdir -p /var/log/pm2
sudo chown ubuntu:ubuntu /var/log/wms
sudo chown ubuntu:ubuntu /var/log/pm2

# Setup PostgreSQL
echo -e "${YELLOW}🗄️  Setting up PostgreSQL database...${NC}"

# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 32)
echo "Generated DB Password: $DB_PASSWORD" > /home/ubuntu/db_credentials.txt
chmod 600 /home/ubuntu/db_credentials.txt

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER wms_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE wms_production OWNER wms_user;
GRANT ALL PRIVILEGES ON DATABASE wms_production TO wms_user;
EOF

# Configure PostgreSQL for local connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/15/main/postgresql.conf

# Update pg_hba.conf for local connections
echo "local   all             wms_user                                md5" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf
echo "host    all             wms_user        127.0.0.1/32            md5" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Setup UFW firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Install AWS CLI (for backups)
echo -e "${YELLOW}☁️  Installing AWS CLI...${NC}"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# Create backup directory
mkdir -p /home/ubuntu/backups

# System optimizations for Node.js
echo -e "${YELLOW}⚡ Applying system optimizations...${NC}"
echo "fs.file-max = 65535" | sudo tee -a /etc/sysctl.conf
echo "ubuntu soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "ubuntu hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# Install monitoring tools
echo -e "${YELLOW}📊 Installing monitoring tools...${NC}"
sudo apt install -y htop iotop nethogs

# Create swap file (helpful for t3.small instances)
echo -e "${YELLOW}💾 Creating 2GB swap file...${NC}"
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Install fail2ban for security
echo -e "${YELLOW}🛡️  Installing fail2ban...${NC}"
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create deployment user directories
mkdir -p /home/ubuntu/deploy
mkdir -p /home/ubuntu/scripts

echo -e "${GREEN}✅ EC2 setup completed successfully!${NC}"
echo -e "${YELLOW}📝 Database credentials saved to: /home/ubuntu/db_credentials.txt${NC}"
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  1. Update .env.production with the database password"
echo "  2. Configure AWS credentials: aws configure"
echo "  3. Deploy your application to /var/www/wms"
echo "  4. Run nginx and pm2 configuration scripts"