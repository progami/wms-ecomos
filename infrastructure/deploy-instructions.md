# WMS Deployment Instructions

## GitHub Actions Deployment (Automated)

### Prerequisites
1. AWS infrastructure created: `make provision`
2. GitHub secrets configured (see below)

### GitHub Secrets Required
- **EC2_HOST**: 54.174.226.39
- **EC2_SSH_KEY**: Contents of ~/.ssh/wms-prod

### Deployment Triggers
- Push to main branch
- Manual trigger from Actions tab

### Manual EC2 Setup (if needed)
```bash
# SSH into EC2
ssh -i ~/.ssh/wms-prod ubuntu@54.174.226.39

# Verify services
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check deployment readiness
ls -la /var/www/wms/
```

## Monitoring
- Application URL: http://54.174.226.39
- GitHub Actions: https://github.com/YOUR_USERNAME/WMS/actions
- EC2 Logs: `ssh -i ~/.ssh/wms-prod ubuntu@54.174.226.39 'pm2 logs wms'`
