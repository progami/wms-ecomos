# WMS Deployment Files

This directory contains all the necessary files for deploying WMS to an EC2 instance as a subdirectory application at `www.targonglobal.com/WMS`.

## 📁 Files Overview

### 🚀 Setup Scripts
- **`install.sh`** - Initial EC2 server setup script (run once)
  - Installs Node.js, PostgreSQL, Nginx, PM2
  - Creates database and user
  - Configures firewall and system optimizations

### 🌐 Configuration Files
- **`.env.production`** - Production environment variables template
- **`ecosystem.config.js`** - PM2 process manager configuration
- **`nginx-wms.conf`** - Nginx configuration for WMS EC2 instance
- **`nginx-main-domain.conf`** - Nginx snippet for main domain proxy

### 🔧 Operational Scripts
- **`backup.sh`** - Automated backup script (database + files to S3)
- **`monitor.sh`** - Health monitoring script
- **`quick-deploy.sh`** - Quick deployment helper for updates

### 📚 Documentation
- **`DEPLOYMENT_GUIDE.md`** - Step-by-step deployment instructions

## 🏗️ Architecture

```
www.targonglobal.com
        |
        ├── /     (Main website)
        ├── /WMS  → WMS EC2 Instance (this app)
        ├── /CRM  → Future CRM app
        └── /ERP  → Future ERP app
```

## 💰 Estimated Monthly Costs

- **t3.small EC2**: ~$15/month
- **30GB Storage**: ~$3/month  
- **Data Transfer**: ~$2/month
- **S3 Backups**: <$1/month
- **Total**: ~$20-25/month

## 🚦 Quick Start

1. **Launch EC2** (t3.small, Ubuntu 22.04)
2. **Run setup**: `./install.sh`
3. **Deploy app**: Follow DEPLOYMENT_GUIDE.md
4. **Configure main domain**: Add proxy rules
5. **Setup backups**: Configure cron job

## 🔐 Security Notes

- Database password is auto-generated during setup
- Remember to generate strong NEXTAUTH_SECRET
- Remove public IP after setup complete
- Use private network communication between servers

## 📊 Monitoring

- Health check: `./monitor.sh`
- PM2 status: `pm2 status`
- Logs: `pm2 logs wms-app`
- Backups: Check `/home/ubuntu/backups/`

## 🆘 Troubleshooting

See DEPLOYMENT_GUIDE.md for common issues and solutions.