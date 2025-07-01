#!/bin/bash

# Exit on error
set -e

echo "Creating Minimal WMS Deployment Package..."

# Variables
DEPLOYMENT_TAR="wms-deployment-minimal.tar.gz"

# Remove old package if exists
if [ -f "$DEPLOYMENT_TAR" ]; then
    echo "Removing old deployment package..."
    rm -f "$DEPLOYMENT_TAR"
fi

# Create deployment package directly without intermediate directory
echo "Creating deployment package..."
tar --exclude='*.log' \
    --exclude='node_modules/.cache' \
    --exclude='*.test.*' \
    --exclude='*.spec.*' \
    -czf "$DEPLOYMENT_TAR" \
    .next \
    prisma \
    src \
    package.json \
    package-lock.json \
    next.config.js \
    server.js \
    tailwind.config.js \
    postcss.config.js \
    tsconfig.json \
    next-env.d.ts \
    .env.production

# Get package size
PACKAGE_SIZE=$(du -h "$DEPLOYMENT_TAR" | cut -f1)

echo ""
echo "✅ Minimal deployment package created successfully!"
echo "📦 Package: $DEPLOYMENT_TAR"
echo "📊 Size: $PACKAGE_SIZE"
echo ""
echo "This package does NOT include node_modules."
echo "You'll need to run 'npm ci' on the EC2 instance after extraction."