# WMS Deployment Files

This directory contains deployment scripts and configurations for the WMS application.

## Structure

- `configs/` - JSON configuration files used during deployment
- `screenshots/` - Screenshots from deployment testing
- `scripts/` - Shell scripts for deployment
- `terraform/` - Terraform infrastructure configurations

## Key Files

### Scripts
- `deploy-ssm.sh` - Main deployment script using AWS Systems Manager
- `check-deployment.sh` - Script to verify deployment status
- `deploy-ansible-ssl.sh` - Deploy with SSL certificates and path-based routing
- `verify-ssl-deployment.sh` - Verify SSL deployment status

### Ansible Configuration
- `infrastructure/ansible/deploy-wms-ssl.yml` - Playbook for SSL deployment
- `infrastructure/ansible/templates/` - Configuration templates

### GitHub Actions
- `.github/workflows/deploy-ssm.yml` - CI/CD pipeline for automated deployment

## Deployment Information

- **Instance ID**: i-054bbceac0f683712
- **IP Address**: 54.204.215.11
- **URL**: http://54.204.215.11/
- **Region**: us-east-1

## Login Credentials

- **Username**: demo@warehouse.com
- **Password**: demo123

## Services

- **Web Server**: Nginx (port 80)
- **App Server**: Node.js with PM2 (port 3001)
- **Database**: PostgreSQL (port 5432)

## Notes

- The application runs without BASE_PATH configuration
- SSL needs to be configured for Cloudflare to work properly
- PM2 is configured to auto-restart the application

## SSL Deployment with Ansible

### Prerequisites

1. Install Ansible on your local machine:
   ```bash
   pip install ansible
   ```

2. Ensure you have SSH access to the server with the key file

3. Domain DNS should point to the server IP (54.204.215.11)

### Deploy with SSL

Run the deployment script:
```bash
cd deployment/scripts
./deploy-ansible-ssl.sh
```

This will:
- Install SSL certificates using Let's Encrypt
- Configure Nginx with HTTPS and path-based routing
- Deploy the application with BASE_PATH=/WMS
- Set up automatic SSL certificate renewal

### Verify Deployment

Run the verification script:
```bash
./verify-ssl-deployment.sh
```

### Access URLs

After successful deployment:
- **WMS Application**: https://targonglobal.com/WMS (login page)
- **Root Path**: https://targonglobal.com/ (returns 404 as requested)

### SSL Certificate Details

- Provider: Let's Encrypt (free SSL)
- Auto-renewal: Configured via cron job
- Certificate location: `/etc/letsencrypt/live/targonglobal.com/`