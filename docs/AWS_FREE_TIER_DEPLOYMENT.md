# AWS Free Tier Deployment Guide for WMS

This guide will help you deploy the WMS application on AWS Free Tier using an EC2 instance.

## AWS Free Tier Resources Used

- **EC2**: t2.micro instance (750 hours/month)
- **EBS**: 30 GB storage
- **RDS**: t3.micro PostgreSQL (750 hours/month)
- **Elastic IP**: 1 static IP address
- **Data Transfer**: 100 GB/month

## Prerequisites

1. AWS Account (new account for free tier)
2. Domain name (targongglobal.com) with DNS access
3. Local development environment working
4. Git repository ready

## Step 1: Launch EC2 Instance

### 1.1 Login to AWS Console
1. Go to https://console.aws.amazon.com
2. Select your preferred region (e.g., us-east-1)

### 1.2 Launch Instance
1. Navigate to EC2 → Instances → Launch Instance
2. Configure:
   - **Name**: `wms-production`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: t2.micro (Free tier eligible)
   - **Key Pair**: Create new key pair
     - Name: `wms-key`
     - Type: RSA
     - Format: .pem
     - Download and save securely
   - **Network Settings**:
     - Create security group: `wms-sg`
     - Allow SSH (22) from your IP
     - Allow HTTP (80) from anywhere
     - Allow HTTPS (443) from anywhere
   - **Storage**: 30 GB gp2 (Free tier includes 30 GB)

3. Click "Launch Instance"

### 1.3 Allocate Elastic IP
1. EC2 → Elastic IPs → Allocate Elastic IP
2. Associate with your instance
3. Note the public IP address

## Step 2: Set Up RDS PostgreSQL

### 2.1 Create Database
1. Navigate to RDS → Create database
2. Configure:
   - **Engine**: PostgreSQL
   - **Version**: 15.x
   - **Templates**: Free tier
   - **DB Instance**: db.t3.micro
   - **Storage**: 20 GB
   - **DB Instance Identifier**: `wms-production-db`
   - **Master Username**: `wms_admin`
   - **Master Password**: Generate secure password
   - **Public Access**: Yes (for initial setup)
   - **VPC Security Group**: Create new
     - Allow PostgreSQL (5432) from EC2 security group

3. Note the endpoint after creation

## Step 3: Configure Domain

### 3.1 Update DNS Records
Add A record for your domain:
```
Type: A
Host: www
Value: [Your Elastic IP]
TTL: 300
```

For subdirectory deployment (/wms):
- The main domain should point to your Elastic IP
- We'll configure nginx to handle /wms routing

## Step 4: Connect to EC2 Instance

### 4.1 SSH Connection
```bash
# Set permissions on key file
chmod 400 ~/Downloads/wms-key.pem

# Connect to instance
ssh -i ~/Downloads/wms-key.pem ubuntu@[YOUR-ELASTIC-IP]
```

## Step 5: Install Application

### 5.1 Run Installation Script
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git
sudo apt install git -y

# Clone your repository
git clone https://github.com/yourusername/wms.git
cd wms

# Run the installation script
cd deploy
chmod +x install.sh
./install.sh
```

### 5.2 Configure Environment Variables
```bash
# Copy environment template
cp .env.example .env.production

# Edit with your values
nano .env.production
```

Required environment variables:
```bash
# Database (use RDS endpoint)
DATABASE_URL=postgresql://wms_admin:YOUR_PASSWORD@your-rds-endpoint.amazonaws.com:5432/wms_production

# Application
NODE_ENV=production
NEXTAUTH_URL=https://targongglobal.com/wms
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Authentication (set strong passwords)
DEMO_ADMIN_PASSWORD=your-strong-admin-password
DEMO_STAFF_PASSWORD=your-strong-staff-password

# AWS (for backups - optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BACKUP_BUCKET=wms-backups
```

### 5.3 Build and Deploy
```bash
# Install dependencies
npm install --production=false

# Run database migrations
npm run db:generate
npm run db:push

# Build application
npm run build:prod

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 6: Configure Nginx

### 6.1 Install Nginx
```bash
sudo apt install nginx -y
```

### 6.2 Configure for Subdirectory
```bash
# Copy nginx configuration
sudo cp deploy/nginx-wms.conf /etc/nginx/sites-available/wms
sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/

# If main domain is on same server
sudo cp deploy/nginx-main-domain.conf /etc/nginx/sites-available/default

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 7: SSL Certificate with Let's Encrypt

### 7.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Obtain Certificate
```bash
sudo certbot --nginx -d targongglobal.com -d www.targongglobal.com
```

## Step 8: Security Hardening

### 8.1 Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 8.2 Secure RDS
1. Go to RDS console
2. Modify your database
3. Set Public accessibility to "No"
4. Update security group to only allow EC2

## Step 9: Set Up Backups

### 9.1 Database Backups
```bash
# Set up automated backups
cd ~/wms/deploy
chmod +x setup-auto-backup.sh
./setup-auto-backup.sh
```

### 9.2 Enable RDS Automated Backups
1. RDS Console → Your database → Modify
2. Enable automated backups
3. Set retention period (7 days for free tier)

## Step 10: Monitoring

### 10.1 CloudWatch (Free Tier)
- Basic EC2 monitoring included
- Set up alarms for:
  - CPU utilization > 80%
  - Status check failures

### 10.2 Application Monitoring
```bash
# View application logs
pm2 logs wms

# Monitor performance
pm2 monit

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
```

## Cost Optimization Tips

1. **Stop instances when not needed**:
   ```bash
   # Via AWS CLI
   aws ec2 stop-instances --instance-ids i-xxxxx
   ```

2. **Use RDS on-demand**:
   - Stop RDS instance when not in use
   - Can be stopped for up to 7 days

3. **Monitor Free Tier usage**:
   - AWS Billing → Free Tier Usage
   - Set up billing alerts

4. **Clean up unused resources**:
   - Delete old snapshots
   - Remove unused Elastic IPs

## Maintenance Commands

```bash
# Update application
cd ~/wms
git pull origin main
npm install --production=false
npm run build:prod
pm2 restart wms

# Database backup
cd ~/wms/scripts/production
./backup-database.sh

# View logs
pm2 logs wms --lines 100

# System health
pm2 status
df -h
free -m
```

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs wms --err
# Check environment variables
pm2 env 0
```

### Database connection issues
```bash
# Test connection
psql -h your-rds-endpoint.amazonaws.com -U wms_admin -d wms_production
```

### Nginx errors
```bash
# Check configuration
sudo nginx -t
# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Monthly Cost Estimate (After Free Tier)

- EC2 t2.micro: ~$8.50/month
- RDS t3.micro: ~$13/month  
- EBS 30GB: ~$3/month
- Data transfer: Variable
- **Total**: ~$25-30/month

## Important Notes

1. **Free Tier Limits**: Valid for 12 months from account creation
2. **Billing Alerts**: Set up to avoid unexpected charges
3. **Backups**: Not included in free tier after 20GB
4. **Support**: Basic support only on free tier

## Next Steps

1. Set up CloudWatch alarms
2. Configure automated backups to S3
3. Implement CDN with CloudFront (optional)
4. Add monitoring with AWS X-Ray (optional)