# WMS Deployment Guide

This directory contains deployment configurations and scripts for the WMS application.

## Current Deployment Method: GitHub Actions CI/CD

The application is now deployed automatically using GitHub Actions when you push to the main branch.

## Server Information

- **Instance ID**: i-054bbceac0f683712
- **IP Address**: 54.204.215.11
- **URL**: https://targonglobal.com/WMS
- **Region**: us-east-1

## How Deployment Works

1. **Local Development**: Work on your local machine
2. **Push to GitHub**: Commit and push changes to the `main` branch
3. **Automatic Deployment**: GitHub Actions automatically:
   - Connects to the server via SSH
   - Pulls the latest code
   - Installs dependencies
   - Builds the application
   - Restarts the PM2 process
   - Runs health checks

## Setup Instructions

### 1. Server Setup (One-time)

SSH into the server and run the preparation script:

```bash
ssh -i ~/.ssh/wms-deploy-key.pem ubuntu@54.204.215.11
cd /home/wms/app
wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deployment/scripts/prepare-server.sh
chmod +x prepare-server.sh
./prepare-server.sh
```

### 2. GitHub Repository Setup

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SERVER_HOST`: `54.204.215.11`
   - `SERVER_USER`: `ubuntu`
   - `SERVER_SSH_KEY`: Content of your SSH private key

To get your SSH key:
```bash
cat ~/.ssh/wms-deploy-key.pem
```

### 3. Deploy

Simply push to the main branch:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

The deployment will start automatically. You can monitor it in the Actions tab of your GitHub repository.

## Manual Deployment

If you need to deploy manually:

```bash
ssh -i ~/.ssh/wms-deploy-key.pem ubuntu@54.204.215.11
sudo -u wms /home/wms/deploy.sh
```

## Services

- **Web Server**: Nginx (SSL on port 443)
- **App Server**: Node.js with PM2 (port 3001)
- **Database**: PostgreSQL (port 5432)
- **Process Manager**: PM2

## Useful Commands

```bash
# Check application status
sudo -u wms pm2 status

# View application logs
sudo -u wms pm2 logs wms-app

# Restart application
sudo -u wms pm2 restart wms-app

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate
sudo certbot certificates
```

## Troubleshooting

### Application won't start
```bash
# Check logs
sudo -u wms pm2 logs wms-app --lines 100

# Check if port is in use
sudo netstat -tlnp | grep 3001

# Rebuild and restart
cd /home/wms/app
sudo -u wms npm run build
sudo -u wms pm2 restart wms-app
```

### Cloudflare 520 Error
1. Check Cloudflare SSL mode is set to "Full" (not "Full (strict)")
2. Ensure nginx is running: `sudo systemctl status nginx`
3. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Git Pull Fails
```bash
# Reset to remote state
cd /home/wms/app
sudo -u wms git fetch origin
sudo -u wms git reset --hard origin/main
```

## Architecture

```
Internet → Cloudflare → Nginx (443) → Node.js (3001) → PostgreSQL
                           ↓
                     SSL (Let's Encrypt)
```

## File Structure

```
deployment/
├── README.md                 # This file
├── configs/                  # Configuration templates
├── scripts/                  # Deployment scripts
│   ├── prepare-server.sh    # Server setup script
│   ├── deploy-ssm.sh        # Legacy SSM deployment
│   └── verify-ssl-deployment.sh
└── screenshots/             # Deployment screenshots
```