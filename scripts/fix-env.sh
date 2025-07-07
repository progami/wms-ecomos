#!/bin/bash
cd /home/wms/app

# Create proper .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://3.235.97.171:3000"
NEXTAUTH_SECRET="production_secret_key_change_in_production_123456"
NODE_ENV="production"
DEMO_ADMIN_PASSWORD="SecureWarehouse2024!"
DEMO_STAFF_PASSWORD="DemoStaff2024!"
PORT=3000
EOF

echo "Environment file updated"
cat .env