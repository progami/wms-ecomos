#!/bin/bash

# WMS Production Setup Script for Self-Hosting
# This script helps set up a production copy of WMS on the same machine

set -e

echo "================================"
echo "WMS Production Setup for Self-Hosting"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the parent directory
PARENT_DIR=$(dirname $(cd "$(dirname "$0")" && pwd))
PROD_DIR="$PARENT_DIR/WMS-production"

echo -e "${YELLOW}This script will set up a production copy of WMS at:${NC}"
echo "$PROD_DIR"
echo ""
echo "The production environment will:"
echo "- Run on port 3001 (instead of 3002)"
echo "- Use a separate PostgreSQL database"
echo "- Be accessible via targongglobal.com/wms (after nginx setup)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Step 1: Create production directory
echo -e "\n${GREEN}Step 1: Creating production directory...${NC}"
if [ -d "$PROD_DIR" ]; then
    echo -e "${YELLOW}Warning: Production directory already exists!${NC}"
    read -p "Remove existing directory and start fresh? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROD_DIR"
    else
        echo "Please remove or rename the existing directory first."
        exit 1
    fi
fi

# Step 2: Copy current project to production
echo -e "\n${GREEN}Step 2: Copying project files...${NC}"
cd "$PARENT_DIR"

# Create a clean copy excluding development files
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.serena' \
    --exclude 'tests/screenshots' \
    --exclude 'tests/playwright-report' \
    --exclude 'tests/playwright-results.xml' \
    --exclude 'tests/build' \
    --exclude '*.log' \
    --exclude '.git' \
    --exclude 'production-setup' \
    WMS/ "$PROD_DIR/"

# Step 3: Set up production environment
echo -e "\n${GREEN}Step 3: Setting up production environment...${NC}"
cd "$PROD_DIR"

# Create production .env file
cat > .env.production << 'EOF'
# Production Environment Variables
NODE_ENV=production

# Database - Production database (different from dev)
DATABASE_URL=postgresql://wms_prod:your_secure_password@localhost:5432/wms_production

# NextAuth - Production settings
NEXTAUTH_URL=https://targongglobal.com/wms
NEXTAUTH_SECRET=generate_this_with_openssl_rand_base64_32

# Application
NEXT_PUBLIC_APP_URL=https://targongglobal.com/wms
PORT=3001

# AWS (Optional - for backups)
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# S3_BACKUP_BUCKET=your-backup-bucket

# Email (Optional)
# EMAIL_FROM=noreply@targongglobal.com
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your_email
# EMAIL_SERVER_PASSWORD=your_password

# Demo Mode - Disable in production
ENABLE_DEMO_MODE=false

# Logging
LOG_LEVEL=info
EOF

echo -e "${YELLOW}Created .env.production template${NC}"
echo "IMPORTANT: You must update the following in .env.production:"
echo "1. DATABASE_URL - Update password and ensure database exists"
echo "2. NEXTAUTH_SECRET - Generate with: openssl rand -base64 32"
echo ""

# Step 4: Create PM2 ecosystem file for production
echo -e "\n${GREEN}Step 4: Creating PM2 configuration...${NC}"
cat > ecosystem.config.production.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wms-production',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    time: true
  }]
};
EOF

# Step 5: Create production build script
echo -e "\n${GREEN}Step 5: Creating build script...${NC}"
cat > build-production.sh << 'EOF'
#!/bin/bash
set -e

echo "Building WMS for production..."

# Load production environment
export NODE_ENV=production
source .env.production

# Clean previous builds
rm -rf .next

# Install production dependencies
npm ci --production=false

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build Next.js application
npm run build

# Install only production dependencies
npm prune --production

echo "Production build complete!"
EOF

chmod +x build-production.sh

# Step 6: Create start script
cat > start-production.sh << 'EOF'
#!/bin/bash

echo "Starting WMS production server..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing globally..."
    npm install -g pm2
fi

# Load environment variables
set -a
source .env.production
set +a

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.production.js

# Save PM2 configuration
pm2 save

echo "Production server started!"
echo "View logs: pm2 logs wms-production"
echo "Monitor: pm2 monit"
EOF

chmod +x start-production.sh

# Step 7: Create database setup script
echo -e "\n${GREEN}Step 6: Creating database setup script...${NC}"
cat > setup-database.sh << 'EOF'
#!/bin/bash

echo "Setting up production database..."

# Database configuration
DB_NAME="wms_production"
DB_USER="wms_prod"

echo "This script will create a PostgreSQL database for production."
echo "You'll need PostgreSQL installed and running."
echo ""

# Prompt for database password
read -s -p "Enter password for database user '$DB_USER': " DB_PASS
echo ""

# Create database and user
sudo -u postgres psql << SQL
-- Create user if not exists
DO
\$do\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE  usename = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
   END IF;
END
\$do\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

echo "Database setup complete!"
echo ""
echo "Update your .env.production file with:"
echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
EOF

chmod +x setup-database.sh

echo -e "\n${GREEN}Production setup scripts created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. cd $PROD_DIR"
echo "2. ./setup-database.sh  # Create production database"
echo "3. Update .env.production with your settings"
echo "4. ./build-production.sh  # Build the application"
echo "5. ./start-production.sh  # Start the production server"
echo ""
echo "After that, configure nginx using the files in production-setup/nginx/"