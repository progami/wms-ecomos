#!/bin/bash

# Server preparation script for GitHub Actions deployment
# Run this on the server to set up automated deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== WMS Server Setup for GitHub Actions ===${NC}"

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    echo -e "${RED}Please run this script as the ubuntu user${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Setting up Git repository...${NC}"
sudo -u wms bash << 'EOF'
cd /home/wms/app

# Initialize git if needed
if [ ! -d .git ]; then
    git init
    git branch -M main
fi

# Check if remote exists
if ! git remote get-url origin &>/dev/null; then
    echo "Adding Git remote for progami/WMS_EcomOS..."
    git remote add origin https://github.com/progami/WMS_EcomOS.git
fi

# Fetch and checkout main branch
echo "Fetching from remote..."
git fetch origin main
git checkout -b main origin/main || git checkout main
git pull origin main

# Create .gitignore for server-specific files
cat > .gitignore.server << 'GITIGNORE'
.env
node_modules/
.next/
logs/
*.log
.pm2/
GITIGNORE

echo "Git repository configured"
EOF

echo -e "${YELLOW}Step 2: Creating deployment script...${NC}"
sudo -u wms bash << 'EOF'
cat > /home/wms/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e

echo "🚀 Starting deployment at $(date)"

cd /home/wms/app

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build application
echo "🔨 Building application..."
npm run build

# Restart application
echo "♻️ Restarting application..."
pm2 restart wms-app || pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

echo "✅ Deployment completed at $(date)"
DEPLOY

chmod +x /home/wms/deploy.sh
EOF

echo -e "${YELLOW}Step 3: Setting up sudoers for GitHub Actions...${NC}"
echo "ubuntu ALL=(wms) NOPASSWD: /home/wms/deploy.sh" | sudo tee /etc/sudoers.d/github-actions
sudo chmod 440 /etc/sudoers.d/github-actions

echo -e "${YELLOW}Step 4: Verifying ecosystem.config.js...${NC}"
sudo -u wms bash << 'EOF'
if [ ! -f /home/wms/app/ecosystem.config.js ]; then
    cat > /home/wms/app/ecosystem.config.js << 'CONFIG'
module.exports = {
  apps: [{
    name: 'wms-app',
    script: './node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/wms/app',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true
  }]
};
CONFIG
fi
EOF

echo -e "${YELLOW}Step 5: Testing deployment script...${NC}"
echo -e "${YELLOW}Running: sudo -u wms /home/wms/deploy.sh${NC}"
read -p "Do you want to test the deployment script now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo -u wms /home/wms/deploy.sh
fi

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo
echo -e "${GREEN}GitHub Actions Setup Instructions:${NC}"
echo -e "${YELLOW}1. Go to your GitHub repository → Settings → Secrets and variables → Actions${NC}"
echo -e "${YELLOW}2. Add these secrets:${NC}"
echo -e "   ${GREEN}SERVER_HOST:${NC} 54.204.215.11"
echo -e "   ${GREEN}SERVER_USER:${NC} ubuntu"
echo -e "   ${GREEN}SERVER_SSH_KEY:${NC} (Your private key content)"
echo
echo -e "${YELLOW}3. To get your private key:${NC}"
echo -e "   cat ~/.ssh/wms-deploy-key.pem"
echo
echo -e "${YELLOW}4. The workflow will automatically deploy when you push to main branch${NC}"
echo
echo -e "${GREEN}Current application status:${NC}"
sudo -u wms pm2 list