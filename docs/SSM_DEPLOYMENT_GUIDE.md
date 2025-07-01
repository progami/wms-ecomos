# SSM Deployment Guide for WMS Application

This guide explains how to deploy and manage the WMS application using AWS Systems Manager (SSM) when SSH access is blocked.

## Overview

Since SSH access is blocked at the AWS account level, we use AWS Systems Manager (SSM) to:
- Deploy the application
- Run commands on the EC2 instance
- Monitor application status
- View logs and troubleshoot issues

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. EC2 instance with SSM agent installed and running
3. IAM permissions for SSM operations

## Instance Information

- **Instance ID**: `i-0fb1f56a90fe95bac`
- **Public DNS**: `ec2-54-221-58-217.compute-1.amazonaws.com`
- **Region**: `us-east-1`
- **Application URL**: http://ec2-54-221-58-217.compute-1.amazonaws.com:3000

## Deployment Scripts

### 1. Initial Deployment

Use the comprehensive deployment script:

```bash
./scripts/ssm-deploy-final.sh
```

This script will:
- Install all required dependencies (Node.js 18, PostgreSQL, nginx, PM2)
- Clone the repository
- Setup the database
- Build and start the application
- Configure nginx as a reverse proxy

### 2. Quick Deployment

For subsequent deployments:

```bash
./scripts/ssm-deploy-inline.sh
```

### 3. Using SSM Commands Directly

Check application status:
```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 status"]' \
    --region "us-east-1"
```

View application logs:
```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 logs wms --lines 50"]' \
    --region "us-east-1"
```

Restart application:
```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 restart wms"]' \
    --region "us-east-1"
```

## GitHub Actions Integration

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-ssm.yml`) that automatically deploys on push to main branch.

### Manual Trigger

You can manually trigger the deployment from GitHub Actions:
1. Go to Actions tab
2. Select "Deploy to EC2 via SSM"
3. Click "Run workflow"
4. Choose the branch and action

## Troubleshooting

### 1. Check SSM Agent Status

```bash
aws ssm describe-instance-information \
    --instance-information-filter-list key=InstanceIds,valueSet=i-0fb1f56a90fe95bac \
    --region us-east-1
```

### 2. Run Diagnostics

```bash
./scripts/ssm-diagnose.sh
```

### 3. View System Logs

```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo journalctl -u nginx -n 50","echo ---","sudo tail -50 /var/log/syslog | grep -E \"node|pm2\""]' \
    --region "us-east-1"
```

### 4. Check Network Configuration

```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo netstat -tlnp","echo ---","sudo iptables -L -n"]' \
    --region "us-east-1"
```

## Security Considerations

1. **Database Credentials**: Currently using default credentials. Change these in production:
   - Database: `wms_db`
   - User: `wms_user`
   - Password: `wms_password`

2. **NextAuth Secret**: Generate a secure secret for production:
   ```bash
   openssl rand -base64 32
   ```

3. **Firewall Rules**: The security group allows:
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 3000 (Application)
   - Port 22 (SSH - though blocked at account level)

## Environment Variables

The application uses `.env.production` with the following variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db
NEXTAUTH_URL=http://ec2-54-221-58-217.compute-1.amazonaws.com:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

## Monitoring

### Application Health

Check the health endpoint:
```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["curl -s http://localhost:3000/api/health | jq ."]' \
    --region "us-east-1"
```

### PM2 Monitoring

PM2 provides process monitoring:
```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["pm2 monit"]' \
    --region "us-east-1"
```

## Backup and Recovery

### Database Backup

```bash
aws ssm send-command \
    --instance-ids "i-0fb1f56a90fe95bac" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["sudo -u postgres pg_dump wms_db > /tmp/wms_backup_$(date +%Y%m%d).sql"]' \
    --region "us-east-1"
```

### Application Backup

The application code is version controlled in Git. Database migrations are tracked via Prisma.

## Future Improvements

1. **Use AWS Secrets Manager** for database credentials
2. **Setup CloudWatch Logs** for centralized logging
3. **Implement Auto Scaling** for high availability
4. **Add Application Load Balancer** for better traffic management
5. **Setup CI/CD pipeline** with proper staging environment
6. **Implement database backups** to S3
7. **Add monitoring and alerting** with CloudWatch

## Support

For issues or questions:
1. Check the deployment logs using the commands above
2. Review the GitHub Actions workflow logs
3. Use the diagnostic scripts to identify problems
4. Check AWS CloudWatch for system metrics