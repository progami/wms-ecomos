# WMS GitHub Actions Deployment

This directory contains documentation for the GitHub Actions-based deployment process for the WMS application.

## Deployment Process

The WMS application is automatically deployed to EC2 using GitHub Actions when changes are pushed to the `main` branch.

## GitHub Actions Workflow

The deployment is handled by `.github/workflows/deploy.yml` which:
- Builds the application
- Creates a deployment package (excluding node_modules, .git, .env files)
- Copies the package to EC2 via SCP
- Extracts and installs dependencies on the server
- Runs database migrations
- Restarts the application using PM2

## Required Secrets

Configure these secrets in your GitHub repository settings:
- `EC2_SSH_KEY`: Private SSH key for EC2 access
- `EC2_HOST`: EC2 instance IP address or hostname

## Manual Deployment

To trigger a deployment manually:
1. Go to Actions tab in GitHub
2. Select "Deploy to EC2" workflow
3. Click "Run workflow"

## Infrastructure Setup

Before using GitHub Actions deployment, ensure:
- EC2 instance is properly configured
- Node.js 18+ is installed
- PM2 is installed globally
- PostgreSQL is set up and running
- Nginx is configured as reverse proxy
- Application directory exists at `/var/www/wms`

## Access Information

After deployment:
- Application URL: `http://<EC2-IP>`
- Default credentials are set in the seed data

## Monitoring

- Check deployment status in GitHub Actions tab
- Application logs: `pm2 logs wms`
- Application status: `pm2 status`