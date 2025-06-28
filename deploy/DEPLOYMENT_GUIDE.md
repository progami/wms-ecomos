# WMS EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the WMS application to an EC2 instance as part of the Targon Global ecosystem at `www.targonglobal.com/WMS`.

## Prerequisites

1. AWS Account with appropriate permissions
2. Domain `www.targonglobal.com` pointing to your main server
3. SSH key pair for EC2 access
4. Basic knowledge of Linux command line

## Architecture Overview

```
Internet → www.targonglobal.com (Main Server)
              ↓
         Main Nginx
              ↓
         /WMS → WMS EC2 Instance (Private Network)
```

## Step 1: Launch EC2 Instance

1. **Log into AWS Console** and navigate to EC2

2. **Launch Instance** with these specifications:
   - **Name**: `wms-production`
   - **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance Type**: t3.small (2 vCPU, 2GB RAM)
   - **Key Pair**: Create new or use existing
   - **Network Settings**:
     - VPC: Same as main server (or create new)
     - Subnet: Private subnet preferred
     - Auto-assign public IP: Yes (for initial setup)
   - **Security Group**: Create new with rules:
     - SSH (22): Your IP
     - HTTP (80): Security group of main server
     - HTTPS (443): Security group of main server
   - **Storage**: 30GB gp3 SSD

3. **Advanced Details**:
   - User data (optional): You can paste the install.sh contents

4. **Launch** and wait for instance to be running

## Step 2: Initial Server Setup

1. **Connect to EC2**:
```bash
ssh -i your-key.pem ubuntu@ec2-public-ip
```

2. **Upload deployment files**:
```bash
# From your local machine
scp -i your-key.pem -r deploy/* ubuntu@ec2-public-ip:~/
```

3. **Run installation script**:
```bash
cd ~
chmod +x install.sh
./install.sh
```

This will install:
- Node.js 18.x
- PostgreSQL 15
- Nginx
- PM2
- Required system packages

4. **Note the database password** from `/home/ubuntu/db_credentials.txt`

## Step 3: Deploy Application

1. **Prepare application locally**:
```bash
# Update dependencies
npm update next@^14.2.30
npm audit fix

# Build application
npm run build

# Create deployment archive
tar -czf wms-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env* \
  --exclude=logs \
  --exclude=backups \
  .
```

2. **Upload to EC2**:
```bash
scp -i your-key.pem wms-deploy.tar.gz ubuntu@ec2-ip:~/
```

3. **On EC2, extract and setup**:
```bash
cd /var/www/wms
tar -xzf ~/wms-deploy.tar.gz
npm ci --production
```

4. **Configure environment**:
```bash
cp ~/deploy/.env.production /var/www/wms/.env.production
nano /var/www/wms/.env.production
```

Update these values:
- `DATABASE_URL`: Use password from db_credentials.txt
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- AWS credentials if using S3

5. **Run database migrations**:
```bash
cd /var/www/wms
npx prisma generate
npx prisma migrate deploy
```

## Step 4: Configure Services

### Nginx Configuration

1. **Copy nginx config**:
```bash
sudo cp ~/nginx-wms.conf /etc/nginx/sites-available/wms
sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
```

2. **Test and reload**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 Configuration

1. **Start application**:
```bash
cd /var/www/wms
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup
```

2. **Verify it's running**:
```bash
pm2 status
pm2 logs wms-app
```

## Step 5: Configure Main Domain

On your main server (www.targonglobal.com):

1. **Edit main nginx config**:
```bash
sudo nano /etc/nginx/sites-available/targonglobal
```

2. **Add WMS location block** (replace WMS_EC2_PRIVATE_IP):
```nginx
location /WMS {
    proxy_pass http://WMS_EC2_PRIVATE_IP;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;
    client_max_body_size 10M;
}
```

3. **Test and reload**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Setup Automated Backups

1. **Configure AWS CLI** (on WMS EC2):
```bash
aws configure
# Enter your AWS credentials
```

2. **Create S3 bucket** for backups:
```bash
aws s3 mb s3://targonglobal-wms-backups
```

3. **Setup cron job**:
```bash
crontab -e
# Add this line:
0 2 * * * /home/ubuntu/backup.sh >> /var/log/wms-backup.log 2>&1
```

## Step 7: Security Hardening

1. **Remove public IP** (after setup):
   - Ensure main server can reach WMS via private IP
   - Disassociate Elastic IP if used

2. **Update security group**:
   - Remove SSH access from anywhere
   - Only allow HTTP/HTTPS from main server

3. **Enable automatic updates**:
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## Step 8: Create Admin User

1. **SSH to WMS EC2** and run:
```bash
cd /var/www/wms
npx tsx scripts/create-admin-user.ts
```

2. **Or create via SQL**:
```bash
sudo -u postgres psql wms_production
```

## Verification Checklist

- [ ] Access https://www.targonglobal.com/WMS
- [ ] Login with admin credentials
- [ ] Check all pages load correctly
- [ ] Test file upload functionality
- [ ] Verify logs are being written
- [ ] Check PM2 status: `pm2 status`
- [ ] Verify backups are running

## Monitoring

1. **Application logs**:
```bash
pm2 logs wms-app
tail -f /var/log/nginx/wms-*.log
```

2. **System resources**:
```bash
htop
df -h
free -m
```

3. **Database**:
```bash
sudo -u postgres psql -c "SELECT count(*) FROM users;"
```

## Troubleshooting

### Application won't start
- Check logs: `pm2 logs wms-app`
- Verify .env.production is correct
- Check database connection

### 502 Bad Gateway
- Ensure PM2 is running: `pm2 status`
- Check if app is listening on port 3000
- Verify nginx proxy_pass settings

### Subdirectory issues
- Ensure basePath is set in next.config.js
- Check NEXTAUTH_URL includes /WMS
- Verify main server proxy configuration

## Maintenance

### Weekly tasks:
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Check disk space
df -h

# Review logs
pm2 logs --lines 100
```

### Monthly tasks:
- Test backup restoration
- Review AWS costs
- Update dependencies if needed

## Scaling Options

When you need to scale:

1. **Vertical**: Upgrade to t3.medium (4GB RAM)
2. **Horizontal**: Add load balancer + second instance
3. **Database**: Move to RDS
4. **Caching**: Add Redis on separate instance

## Support

For issues:
1. Check application logs
2. Review nginx error logs
3. Verify all services are running
4. Check network connectivity between servers