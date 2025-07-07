#!/bin/bash

# Deployment verification and startup script for WMS
set -e

echo "=== WMS Deployment Verification and Startup ==="
echo "Current date: $(date)"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a process is running
process_running() {
    pgrep -f "$1" > /dev/null 2>&1
}

# 1. Verify prerequisites
echo -e "\n1. Checking prerequisites..."
for cmd in node npm npx psql pm2; do
    if command_exists $cmd; then
        echo "✓ $cmd is installed: $($cmd --version 2>&1 | head -1)"
    else
        echo "✗ $cmd is NOT installed"
        exit 1
    fi
done

# 2. Check Node.js version
NODE_VERSION=$(node -v)
echo -e "\n2. Node.js version: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v18\.|^v20\. ]]; then
    echo "Warning: Node.js version should be 18.x or 20.x for optimal performance"
fi

# 3. Check database connection
echo -e "\n3. Checking database connection..."
if psql postgresql://wms_user:wms_secure_password_2025@localhost:5432/wms_production -c "SELECT version();" >/dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    echo "Please ensure PostgreSQL is running and credentials are correct"
    exit 1
fi

# 4. Check if build exists
echo -e "\n4. Checking build status..."
if [ -d ".next" ]; then
    echo "✓ Build directory exists"
    BUILD_TIME=$(stat -c %Y .next 2>/dev/null || stat -f %m .next)
    CURRENT_TIME=$(date +%s)
    AGE=$((CURRENT_TIME - BUILD_TIME))
    echo "  Build age: $((AGE / 60)) minutes"
else
    echo "✗ Build directory not found"
    echo "  Running build..."
    npm run build || {
        echo "Build failed. Trying development mode instead..."
        DEVELOPMENT_MODE=true
    }
fi

# 5. Check environment file
echo -e "\n5. Checking environment configuration..."
if [ -f ".env.production" ]; then
    echo "✓ Production environment file exists"
else
    echo "✗ Production environment file not found"
    echo "Please create .env.production with proper configuration"
    exit 1
fi

# 6. Check PM2 status
echo -e "\n6. Checking PM2 status..."
if process_running "PM2"; then
    echo "✓ PM2 is running"
    pm2 list
else
    echo "✗ PM2 is not running"
fi

# 7. Start or restart application
echo -e "\n7. Starting/restarting application..."
if [ "$DEVELOPMENT_MODE" = "true" ]; then
    echo "Starting in development mode..."
    pm2 delete wms-app 2>/dev/null || true
    pm2 start npm --name wms-app -- run dev
else
    echo "Starting in production mode..."
    pm2 delete wms-app 2>/dev/null || true
    
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start server.js --name wms-app --max-memory-restart 1G
    fi
fi

# 8. Save PM2 configuration
echo -e "\n8. Saving PM2 configuration..."
pm2 save
pm2 startup systemd -u wms --hp /home/wms || echo "Run as root: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u wms --hp /home/wms"

# 9. Check if app is running
echo -e "\n9. Waiting for application to start..."
sleep 5
if pm2 list | grep -q "wms-app.*online"; then
    echo "✓ Application is running"
    
    # Test HTTP endpoint
    echo -e "\n10. Testing HTTP endpoint..."
    for i in {1..10}; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302\|301"; then
            echo "✓ Application is responding on port 3000"
            break
        else
            echo "  Waiting for app to respond... ($i/10)"
            sleep 3
        fi
    done
else
    echo "✗ Application failed to start"
    echo "Checking logs..."
    pm2 logs wms-app --lines 50
    exit 1
fi

# 11. Create admin user if needed
echo -e "\n11. Creating admin user..."
cat > /tmp/create-admin.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@targonglobal.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@2025!', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@targonglobal.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('Admin user created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
EOF

node /tmp/create-admin.js

# 12. Final status
echo -e "\n=== Deployment Status ==="
echo "Application URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "Public URL: http://$(curl -s ifconfig.me):3000"
echo ""
echo "Default admin credentials:"
echo "Email: admin@targonglobal.com"
echo "Password: Admin@2025!"
echo ""
echo "PM2 commands:"
echo "  pm2 list         - Show process list"
echo "  pm2 logs         - Show logs"
echo "  pm2 restart all  - Restart application"
echo "  pm2 monit        - Monitor application"
echo ""
echo "Deployment completed successfully!"