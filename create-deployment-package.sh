#!/bin/bash

# Exit on error
set -e

echo "Creating WMS Deployment Package..."

# Variables
DEPLOYMENT_DIR="deployment-package"
DEPLOYMENT_TAR="wms-deployment.tar.gz"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Clean up old deployment directory if exists
if [ -d "$DEPLOYMENT_DIR" ]; then
    echo "Removing old deployment directory..."
    rm -rf "$DEPLOYMENT_DIR"
fi

# Create deployment directory
echo "Creating deployment directory..."
mkdir -p "$DEPLOYMENT_DIR"

# Copy necessary files
echo "Copying application files..."
cp -r .next "$DEPLOYMENT_DIR/"
cp -r prisma "$DEPLOYMENT_DIR/"
cp -r src "$DEPLOYMENT_DIR/"
cp -r node_modules "$DEPLOYMENT_DIR/"
cp package.json "$DEPLOYMENT_DIR/"
cp package-lock.json "$DEPLOYMENT_DIR/"
cp next.config.js "$DEPLOYMENT_DIR/"
cp server.js "$DEPLOYMENT_DIR/"
cp tailwind.config.js "$DEPLOYMENT_DIR/"
cp postcss.config.js "$DEPLOYMENT_DIR/"
cp tsconfig.json "$DEPLOYMENT_DIR/"
cp next-env.d.ts "$DEPLOYMENT_DIR/"

# Copy production environment file as template
if [ -f ".env.production" ]; then
    cp .env.production "$DEPLOYMENT_DIR/.env.production.template"
fi

# Create deployment script
cat > "$DEPLOYMENT_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "Deploying WMS Application..."

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Start the application with PM2
echo "Starting application with PM2..."
pm2 delete wms || true
pm2 start server.js --name wms --max-memory-restart 1G

# Save PM2 configuration
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "Deployment complete!"
EOF

chmod +x "$DEPLOYMENT_DIR/deploy.sh"

# Create a README for deployment
cat > "$DEPLOYMENT_DIR/README.md" << 'EOF'
# WMS Deployment Package

This package contains the built WMS application ready for deployment.

## Prerequisites on EC2 Instance

1. Node.js 18+ and npm
2. PostgreSQL database
3. PM2 (npm install -g pm2)
4. Nginx (for reverse proxy)

## Deployment Steps

1. Upload this package to EC2 instance
2. Extract the package: `tar -xzf wms-deployment.tar.gz`
3. Navigate to the deployment directory: `cd deployment-package`
4. Copy and configure the environment file:
   ```bash
   cp .env.production.template .env.production
   # Edit .env.production with your actual values
   ```
5. Install dependencies (if needed): `npm ci --production`
6. Run the deployment script: `./deploy.sh`

## Manual Deployment

If the deployment script fails, you can deploy manually:

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start with PM2
pm2 start server.js --name wms --max-memory-restart 1G
pm2 save
```

## Nginx Configuration

Configure Nginx to proxy requests to the application:

```nginx
location /WMS {
    proxy_pass http://localhost:3000;
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
EOF

# Create the tar.gz package
echo "Creating deployment package..."
tar -czf "$DEPLOYMENT_TAR" "$DEPLOYMENT_DIR"

# Get package size
PACKAGE_SIZE=$(du -h "$DEPLOYMENT_TAR" | cut -f1)

echo ""
echo "✅ Deployment package created successfully!"
echo "📦 Package: $DEPLOYMENT_TAR"
echo "📊 Size: $PACKAGE_SIZE"
echo ""
echo "Next steps:"
echo "1. Upload to S3: aws s3 cp $DEPLOYMENT_TAR s3://your-bucket/"
echo "2. Generate presigned URL: aws s3 presign s3://your-bucket/$DEPLOYMENT_TAR --expires-in 3600"
echo "3. Deploy to EC2 using the presigned URL"