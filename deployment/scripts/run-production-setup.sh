#!/bin/bash

# Production User Setup Script
# This script should be run on the production server

set -e

echo "==================================================="
echo "WMS PRODUCTION USER SETUP"
echo "==================================================="
echo ""
echo "This script will:"
echo "1. Remove ALL existing data from the database"
echo "2. Create 3 new production users"
echo ""
echo "⚠️  WARNING: This is a destructive operation!"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Setup cancelled."
    exit 0
fi

# Navigate to the application directory
cd /home/wms/wms-app

# Install ts-node if not present
if ! command -v ts-node &> /dev/null; then
    echo "Installing ts-node..."
    npm install -g ts-node typescript
fi

# Run cleanup script
echo ""
echo "Step 1: Running database cleanup..."
echo "==================================="
npx ts-node scripts/cleanup-database.ts

# Run user setup script
echo ""
echo "Step 2: Setting up production users..."
echo "======================================"
npx ts-node scripts/setup-users.ts

echo ""
echo "✅ Production setup completed!"
echo ""
echo "IMPORTANT REMINDERS:"
echo "- Save the user passwords shown above immediately"
echo "- Consider implementing a password reset feature"
echo "- Enable 2FA for admin accounts"
echo ""