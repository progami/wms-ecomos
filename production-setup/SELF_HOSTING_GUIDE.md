# Self-Hosting WMS on Local Computer

This guide will help you set up the WMS application on your local computer with a production-like environment accessible via `https://targongglobal.com/wms`.

## Overview

The setup creates:
- **Development Environment**: Continue using `localhost:3002` in the `WMS` folder
- **Production Environment**: Access via `targongglobal.com/wms` from `WMS-production` folder
- **Separate Databases**: Different PostgreSQL databases for dev and production
- **Nginx Reverse Proxy**: Handles the /wms subdirectory routing

## Prerequisites

- macOS (this guide is for macOS, but can be adapted for Linux)
- Homebrew installed
- PostgreSQL installed and running
- Node.js 18.x or higher
- Git

## Quick Start

### 1. Run the Setup Script

```bash
cd production-setup
./setup-production.sh
```

This script will:
- Create a `WMS-production` directory at the parent level
- Copy all project files (excluding development artifacts)
- Create production configuration files
- Set up PM2 ecosystem configuration

### 2. Set Up the Production Database

```bash
cd ../../WMS-production
./setup-database.sh
```

This will:
- Create a new PostgreSQL database named `wms_production`
- Create a database user `wms_prod`
- Grant necessary permissions

### 3. Configure Environment Variables

Edit `.env.production` and update:

1. **Generate a secure NEXTAUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

2. **Update the DATABASE_URL** with the password you set in step 2

3. **Verify other settings** are correct for your environment

### 4. Build the Production Application

```bash
./build-production.sh
```

This will:
- Install dependencies
- Run database migrations
- Build the Next.js application for production
- Optimize for production deployment

### 5. Set Up Nginx

```bash
cd production-setup/nginx
./setup-nginx-macos.sh
```

This will:
- Install Nginx (if not already installed)
- Configure Nginx to serve targongglobal.com/wms
- Generate a self-signed SSL certificate
- Start Nginx service

### 6. Configure Local DNS

Add these lines to `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 targongglobal.com
127.0.0.1 www.targongglobal.com
```

### 7. Start the Production Server

```bash
cd ../../WMS-production
./start-production.sh
```

This starts the application using PM2 process manager.

## Accessing the Application

1. **Production**: https://targongglobal.com/wms
   - Your browser will show a security warning (self-signed certificate)
   - Click "Advanced" and proceed to the site

2. **Development**: http://localhost:3002
   - Continue development in the original WMS folder

## Managing the Production Server

### PM2 Commands

```bash
# View logs
pm2 logs wms-production

# Monitor performance
pm2 monit

# Restart application
pm2 restart wms-production

# Stop application
pm2 stop wms-production

# View status
pm2 status
```

### Nginx Commands

```bash
# Restart Nginx
brew services restart nginx

# Stop Nginx
brew services stop nginx

# Check Nginx logs
tail -f /usr/local/var/log/nginx/targongglobal.*.log
```

## Updating Production

When you want to deploy new changes:

1. In development folder, commit your changes:
   ```bash
   cd WMS
   git add .
   git commit -m "Your changes"
   ```

2. Copy changes to production:
   ```bash
   cd production-setup
   ./update-production.sh  # You'll need to create this script
   ```

3. In production folder:
   ```bash
   cd WMS-production
   git pull  # If using git
   ./build-production.sh
   pm2 restart wms-production
   ```

## Troubleshooting

### Port Already in Use

If port 3001 is already in use:
```bash
lsof -i :3001  # Find process using the port
kill -9 <PID>  # Kill the process
```

### Nginx Not Starting

Check configuration:
```bash
nginx -t
```

Check error logs:
```bash
tail -f /usr/local/var/log/nginx/error.log
```

### Database Connection Issues

Verify PostgreSQL is running:
```bash
brew services list | grep postgresql
```

Test database connection:
```bash
psql -U wms_prod -d wms_production -h localhost
```

### SSL Certificate Issues

Regenerate certificate:
```bash
cd production-setup/nginx
./generate-ssl-cert.sh
brew services restart nginx
```

## Security Considerations

This setup is for **local development only**. For public internet access:

1. Use a real SSL certificate (Let's Encrypt)
2. Configure firewall rules
3. Set up fail2ban for brute force protection
4. Use strong passwords for all services
5. Keep all software updated
6. Set up automated backups

## Making It Public (Advanced)

To make this accessible from the internet:

1. **Configure Router**:
   - Forward port 443 to your computer
   - Forward port 80 to your computer

2. **Dynamic DNS** (if no static IP):
   - Use a service like DynDNS or No-IP
   - Update targongglobal.com DNS to point to your IP

3. **Real SSL Certificate**:
   - Use Let's Encrypt with certbot
   - Configure auto-renewal

4. **Security Hardening**:
   - Enable macOS firewall
   - Install and configure fail2ban
   - Set up intrusion detection

**Warning**: Exposing your computer to the internet has significant security risks. Consider using a VPS or cloud provider instead.

## Recommended Alternative: VPS Deployment

Instead of self-hosting on your computer, consider:

1. **DigitalOcean**: $20/month for suitable droplet
2. **Linode**: Similar pricing and features
3. **AWS EC2**: Free tier available for 12 months
4. **Vultr**: Good performance at low cost

Benefits:
- Always online
- Better security
- Static IP address
- Professional environment
- Easy backups and scaling