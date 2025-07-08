# WMS Deployment Guide

## Production Deployment with BASE_PATH

When deploying the WMS application to a subdirectory (e.g., `/WMS`), special configuration is required for NextAuth and routing to work correctly.

### Environment Variables

The following environment variables must be set for subdirectory deployment:

```bash
# Base path configuration
BASE_PATH=/WMS
NEXT_PUBLIC_BASE_PATH=/WMS

# NextAuth configuration
NEXTAUTH_URL=https://www.targonglobal.com/WMS
NEXTAUTH_SECRET=your-secret-here

# Application URL
NEXT_PUBLIC_APP_URL=https://www.targonglobal.com/WMS
```

### Key Changes for BASE_PATH Support

1. **NextAuth Configuration** (`src/lib/auth.ts`):
   - Pages configuration now includes base path
   - Debug mode enabled for development

2. **Middleware** (`src/middleware.ts`):
   - Removes base path from pathname for route checking
   - Adds base path to redirects

3. **API Calls**:
   - Use `withBasePath()` utility for all internal API calls
   - `fetchWithCSRF` automatically handles base path
   - New `api-client.ts` provides convenience methods

4. **Login Page**:
   - All API calls use base path
   - Redirects include base path

### Deployment Steps

1. **Set Environment Variables**:
   ```bash
   export BASE_PATH=/WMS
   export NEXT_PUBLIC_BASE_PATH=/WMS
   export NEXTAUTH_URL=https://www.targonglobal.com/WMS
   ```

2. **Build the Application**:
   ```bash
   NODE_ENV=production npm run build
   ```

3. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

### Using the Deployment Script

A deployment script is provided at `scripts/deploy-production.sh`:

```bash
# On the server
cd /home/wms/app
./scripts/deploy-production.sh
```

This script:
- Pulls latest code
- Installs dependencies
- Builds with production settings
- Sets up environment variables
- Restarts PM2 process

### Troubleshooting

1. **Authentication Failures**:
   - Check NEXTAUTH_URL includes the base path
   - Verify BASE_PATH and NEXT_PUBLIC_BASE_PATH are set
   - Check PM2 logs: `pm2 logs wms-app`

2. **API Route 404s**:
   - Ensure all fetch calls use `withBasePath()` or `fetchWithCSRF`
   - Check middleware is properly handling base path

3. **Redirect Issues**:
   - Verify login page redirects include base path
   - Check middleware redirects use base path

### PM2 Configuration

The `ecosystem.config.js` file includes production environment settings:

```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 3000,
  BASE_PATH: '/WMS',
  NEXT_PUBLIC_BASE_PATH: '/WMS',
  NEXTAUTH_URL: 'https://www.targonglobal.com/WMS'
}
```

### Nginx Configuration

For reverse proxy with Nginx:

```nginx
location /WMS {
    proxy_pass http://localhost:3000/WMS;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```