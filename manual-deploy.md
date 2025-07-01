# Manual Deployment via EC2 Instance Connect

Since SSH is not working from your local machine, use **EC2 Instance Connect** from AWS Console:

## Steps:

1. **Go to AWS Console**
   - https://console.aws.amazon.com/ec2
   - Select region: `us-east-1` (N. Virginia)

2. **Find Your Instance**
   - Look for instance ID: `i-0c02623e8c47e509a`
   - Or search by name: `wms-prod`

3. **Connect via Browser**
   - Select the instance
   - Click "Connect" button
   - Choose "EC2 Instance Connect" tab
   - Keep username as `ubuntu`
   - Click "Connect"

4. **Once Connected, Deploy Your App**
   ```bash
   # Check current status
   cd /var/www/wms
   ls -la
   
   # Clone your repository
   git clone https://github.com/progami/WMS_EcomOS.git .
   
   # Install dependencies
   npm install
   
   # Build the application
   npm run build
   
   # Create environment file
   cat > .env.production << EOF
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://wms:wms_password_2024@localhost:5432/wms
   NEXTAUTH_URL=http://ec2-54-174-226-39.compute-1.amazonaws.com
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   DEMO_ADMIN_PASSWORD=Admin@2024
   DEMO_STAFF_PASSWORD=Staff@2024
   EOF
   
   # Start with PM2
   pm2 start npm --name wms -- start
   pm2 save
   
   # Check if running
   pm2 status
   curl http://localhost:3000
   ```

## Alternative: Fix SSH Issue

The SSH timeout might be due to:
1. Your ISP blocking port 22
2. Corporate firewall
3. VPN interference

Try:
- Disconnect from VPN
- Use mobile hotspot
- Use EC2 Instance Connect (browser-based SSH)