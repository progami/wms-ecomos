# WMS Deployment Summary

## Deployment Package Location
- **S3 Bucket**: `wms-deployment-1751383624`
- **Package**: `wms-built-minimal.tar.gz` (56MB)
- **Presigned URL** (valid for 1 hour): 
  ```
  https://wms-deployment-1751383624.s3.us-east-1.amazonaws.com/wms-built-minimal.tar.gz?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAWV36AUWTHQOZ3OH5%2F20250701%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250701T153158Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=7123d0d665c089f7c160d572b23f9d6f4e3a6722b2f9249ff1f26a03b5983512
  ```

## EC2 Instance Details
- **Instance ID**: `i-065d0aa80cdcd55b1`
- **Public IP**: `3.87.244.116`
- **Platform**: Ubuntu Linux
- **SSM Status**: Connection Lost (manual deployment required)

## Manual Deployment Steps

Since SSM is not available, please connect to the instance via SSH and follow these steps:

1. **SSH into the instance**:
   ```bash
   ssh -i your-key.pem ubuntu@3.87.244.116
   ```

2. **Download the deployment package** (choose one method):
   - Using AWS CLI: `aws s3 cp s3://wms-deployment-1751383624/wms-built-minimal.tar.gz /tmp/`
   - Using presigned URL: `wget -O /tmp/wms-built-minimal.tar.gz "PRESIGNED_URL"`

3. **Run the deployment script**:
   - Download: `aws s3 cp s3://wms-deployment-1751383624/deploy-prebuilt.sh /tmp/`
   - Execute: `chmod +x /tmp/deploy-prebuilt.sh && bash /tmp/deploy-prebuilt.sh`

   OR

4. **Execute commands manually** from `manual-deploy-commands.txt`

## What the Deployment Does
1. Extracts pre-built Next.js application to `/var/www/wms`
2. Installs production dependencies only (`npm ci --production`)
3. Sets up environment variables in `.env`
4. Runs Prisma database migrations
5. Configures and starts the application with PM2
6. Sets up PM2 to start on system boot

## Post-Deployment
- Application runs on port 3000
- Check status: `pm2 status`
- View logs: `pm2 logs wms`
- Restart: `pm2 restart wms`
- Stop: `pm2 stop wms`

## Troubleshooting SSM
If you want to fix SSM for future deployments:
1. Check SSM agent: `sudo systemctl status amazon-ssm-agent`
2. Restart SSM agent: `sudo systemctl restart amazon-ssm-agent`
3. Check IAM role has SSM permissions
4. Ensure outbound HTTPS (443) is allowed to SSM endpoints