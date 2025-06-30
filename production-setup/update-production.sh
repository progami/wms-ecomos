#!/bin/bash

# Script to update production with latest changes from development

set -e

echo "================================"
echo "Update WMS Production"
echo "================================"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get directories
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DEV_DIR=$(dirname "$SCRIPT_DIR")
PROD_DIR=$(dirname "$DEV_DIR")/WMS-production

echo -e "${YELLOW}This will update production from:${NC}"
echo "Development: $DEV_DIR"
echo "Production:  $PROD_DIR"
echo ""

# Check if production directory exists
if [ ! -d "$PROD_DIR" ]; then
    echo -e "${RED}Error: Production directory not found!${NC}"
    echo "Please run setup-production.sh first."
    exit 1
fi

# Check for uncommitted changes in dev
cd "$DEV_DIR"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes in development!${NC}"
    git status -s
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 1
    fi
fi

# Stop production server
echo -e "\n${GREEN}Stopping production server...${NC}"
cd "$PROD_DIR"
pm2 stop wms-production 2>/dev/null || echo "PM2 process not running"

# Backup current production
echo -e "\n${GREEN}Creating backup...${NC}"
BACKUP_DIR="$PROD_DIR/../wms-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$PROD_DIR/.env.production" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$PROD_DIR/logs" "$BACKUP_DIR/" 2>/dev/null || true
echo "Backup created at: $BACKUP_DIR"

# Sync files from dev to production
echo -e "\n${GREEN}Syncing files...${NC}"
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.production' \
    --exclude '.serena' \
    --exclude 'tests/screenshots' \
    --exclude 'tests/playwright-report' \
    --exclude 'tests/playwright-results.xml' \
    --exclude 'tests/build' \
    --exclude '*.log' \
    --exclude 'logs' \
    --exclude '.git' \
    --exclude 'production-setup' \
    --exclude 'pm2' \
    "$DEV_DIR/" "$PROD_DIR/"

# Copy production-specific configs
echo -e "\n${GREEN}Updating production configs...${NC}"
cp "$SCRIPT_DIR/next.config.production.js" "$PROD_DIR/next.config.js"

# Install dependencies if package.json changed
echo -e "\n${GREEN}Checking dependencies...${NC}"
cd "$PROD_DIR"
if ! cmp -s "$DEV_DIR/package.json" "$PROD_DIR/package.json"; then
    echo "Package.json changed, installing dependencies..."
    npm ci --production=false
fi

# Run database migrations
echo -e "\n${GREEN}Running database migrations...${NC}"
export NODE_ENV=production
source .env.production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build application
echo -e "\n${GREEN}Building application...${NC}"
npm run build

# Prune dev dependencies
npm prune --production

# Start production server
echo -e "\n${GREEN}Starting production server...${NC}"
pm2 start ecosystem.config.production.js

# Show status
pm2 status

echo -e "\n${GREEN}Update complete!${NC}"
echo ""
echo "Production has been updated with the latest changes."
echo "Access at: https://targongglobal.com/wms"
echo ""
echo "To view logs: pm2 logs wms-production"