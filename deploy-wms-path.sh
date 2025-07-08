#!/bin/bash
# Script to configure WMS application at /WMS path

echo "=== Configuring WMS for path-based routing at /WMS ==="

# Create updated Nginx configuration
cat > /tmp/nginx-wms-path.conf << 'NGINX_CONFIG'
server {
    listen 80;
    listen 443 ssl http2;
    server_name targonglobal.com www.targonglobal.com;
    
    # SSL certificates (keep existing)
    ssl_certificate /etc/letsencrypt/live/targonglobal.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/targonglobal.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    # Handle /WMS and /WMS/* requests
    location /WMS {
        # Remove /WMS prefix when proxying
        rewrite ^/WMS/(.*)$ /$1 break;
        rewrite ^/WMS$ / break;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Prefix /WMS;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Increase timeouts for large operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Redirect root to /WMS
    location = / {
        return 301 /WMS;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_CONFIG

# Create Next.js configuration update
cat > /tmp/next-config-update.js << 'NEXTJS_CONFIG'
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/WMS',
  assetPrefix: '/WMS',
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variable substitution
  env: {
    NEXT_PUBLIC_BASE_PATH: '/WMS',
  },
  
  // Ensure API routes work correctly
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
  
  // Disable image optimization for standalone mode
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
NEXTJS_CONFIG

# Create PM2 ecosystem configuration
cat > /tmp/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'wms-production',
    script: '.next/standalone/server.js',
    cwd: '/home/wms/wms-app',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/wms/logs/pm2-error.log',
    out_file: '/home/wms/logs/pm2-out.log',
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: 'postgresql://wms:wms_secure_password_2024@localhost:5432/wms',
      NEXTAUTH_URL: 'https://targonglobal.com/WMS',
      NEXTAUTH_URL_INTERNAL: 'http://127.0.0.1:3000',
      NEXTAUTH_SECRET: 'production_secret_key_change_in_production_123456',
      NEXT_PUBLIC_APP_URL: 'https://targonglobal.com/WMS',
      NEXT_PUBLIC_BASE_PATH: '/WMS'
    }
  }]
};
PM2_CONFIG

# Create auth configuration patch
cat > /tmp/auth-config-patch.js << 'AUTH_PATCH'
// Add to NextAuth configuration callbacks
callbacks: {
  async redirect({ url, baseUrl }) {
    // Ensure redirects include the base path
    if (url.startsWith("/")) {
      return \`\${baseUrl}\${url}\`
    }
    else if (new URL(url).origin === baseUrl) {
      return url
    }
    return baseUrl
  },
  async session({ session, token }) {
    // Include base path in session if needed
    return session
  },
}
AUTH_PATCH

echo "=== Configuration files created ==="
echo ""
echo "To deploy these changes to your EC2 instance:"
echo "1. Copy files to the server"
echo "2. Update Nginx configuration"
echo "3. Update Next.js configuration"
echo "4. Rebuild and restart the application"
echo ""
echo "Would you like me to create the deployment commands?"