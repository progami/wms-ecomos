# WMS Deployment Files

This directory contains deployment scripts and configurations for the WMS application.

## Structure

- `configs/` - JSON configuration files used during deployment
- `screenshots/` - Screenshots from deployment testing
- `scripts/` - Shell scripts for deployment

## Key Files

### Scripts
- `deploy-ssm.sh` - Main deployment script using AWS Systems Manager
- `check-deployment.sh` - Script to verify deployment status

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