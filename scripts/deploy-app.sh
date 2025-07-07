#!/bin/bash
# This script runs on the EC2 instance to deploy the app

cd /home/wms

# Clone or update repository
if [ ! -d "app" ]; then
    sudo -u wms git clone https://github.com/progami/WMS_EcomOS.git app
else
    cd app
    sudo -u wms git pull origin main
    cd ..
fi

cd app

# Create .env file
cat > /home/wms/app/.env << 'EOF'
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
NEXTAUTH_SECRET="production_secret_key_change_in_production"
NODE_ENV="production"
DEMO_ADMIN_PASSWORD="SecureWarehouse2024!"
DEMO_STAFF_PASSWORD="DemoStaff2024!"
PORT=3000
EOF
chown wms:wms /home/wms/app/.env

# Install dependencies
sudo -u wms npm ci
sudo -u wms npx prisma generate

# Run migrations or push schema
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    sudo -u wms npx prisma migrate deploy
else
    sudo -u wms npx prisma db push --skip-generate
fi

# Seed database
sudo -u wms npx prisma db seed || true

# Build application
sudo -u wms npm run build

# Restart application
sudo -u wms pm2 delete wms-app || true
sudo -u wms PORT=3000 pm2 start npm --name wms-app -- start
sudo -u wms pm2 save

# Restart nginx
sudo systemctl restart nginx

# Check health
sleep 5
curl -s http://localhost:3000/api/health && echo " - App is healthy!" || echo " - App health check failed"