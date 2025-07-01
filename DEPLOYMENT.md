# WMS Deployment Guide

## Overview

The WMS application uses GitHub Actions for automated deployment to AWS EC2. The infrastructure is managed with Terraform, and deployments are triggered automatically when code is pushed to the main branch.

## Current Status

- **Infrastructure**: ✅ EC2 instance running at http://54.174.226.39
- **Nginx**: ✅ Running and accessible
- **Application**: ❌ Not yet deployed (showing nginx default page)
- **GitHub Actions**: ✅ Configured and ready

## Architecture

```
GitHub Repository
    ↓ (push to main)
GitHub Actions
    ↓ (build & deploy)
AWS EC2 Instance
    ↓
Nginx → PM2 → Next.js App → PostgreSQL
```

## Deployment Methods

### Method 1: GitHub Actions (Recommended)

1. **Configure GitHub Secrets**
   - Go to: Settings → Secrets and variables → Actions
   - Add:
     - `EC2_HOST`: 54.174.226.39
     - `EC2_SSH_KEY`: Contents of `~/.ssh/wms-prod`

2. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

3. **Monitor**
   - Check Actions tab in GitHub
   - View logs: `make logs`

### Method 2: EC2 Instance Connect (Manual)

1. **Access EC2**
   - AWS Console → EC2 → Instances
   - Select `i-0c02623e8c47e509a`
   - Click Connect → EC2 Instance Connect

2. **Deploy Commands**
   ```bash
   cd /var/www/wms
   git clone https://github.com/YOUR_USERNAME/WMS.git .
   npm install
   npm run build
   
   # Create environment file
   cat > .env.production << EOF
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://wms:wms_password_2024@localhost:5432/wms
   NEXTAUTH_URL=http://54.174.226.39
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   EOF
   
   # Start application
   pm2 start npm --name wms -- start
   pm2 save
   ```

## Infrastructure Management

### Provision Infrastructure
```bash
cd infrastructure
make provision
```

### Check Status
```bash
make status
```

### SSH Access (when available)
```bash
make ssh
```

### View Logs
```bash
make logs
```

### Destroy Infrastructure
```bash
make destroy
```

## Files Structure

```
infrastructure/
├── Makefile              # Infrastructure commands
├── setup-github-secrets.sh   # GitHub setup helper
├── terraform/
│   └── environments/
│       └── prod/
│           ├── main.tf   # EC2, networking, security
│           ├── variables.tf
│           └── terraform.tfvars
└── deploy/
    └── README.md         # Deployment documentation

.github/
└── workflows/
    └── deploy.yml        # GitHub Actions workflow
```

## Troubleshooting

### SSH Connection Issues
- The EC2 instance may take 5-10 minutes to fully initialize
- Use EC2 Instance Connect as an alternative
- Check security group allows SSH from your IP

### Application Not Loading
- Verify nginx is running: `curl http://54.174.226.39`
- Check PM2 status: `pm2 status`
- View logs: `pm2 logs wms`

### Database Connection
- PostgreSQL credentials: `wms` / `wms_password_2024`
- Database name: `wms`
- Connection string in `.env.production`

## Security Notes

- Never commit `.env` files
- Keep `EC2_SSH_KEY` secret secure
- Use strong passwords for production
- Enable HTTPS for production use

## Next Steps

1. Complete GitHub secrets configuration
2. Deploy application via GitHub Actions
3. Verify application is accessible
4. Set up domain name (optional)
5. Enable HTTPS with Let's Encrypt (optional)