#!/bin/bash

# Commands to run on the remote server to complete deployment
# These can be executed via SSM when it's available

cat << 'EOF'
# 1. Switch to wms user and check current status
sudo su - wms
cd /home/wms/app

# 2. Check if npm build completed
if [ -d ".next" ]; then
    echo "Build directory exists"
else
    echo "Build directory missing, running build..."
    npm run build
fi

# 3. Update database password in .env to match current setup
sed -i 's/wms_secure_password_2024/wms_secure_password_2025/g' .env

# 4. Update database URL
export DATABASE_URL="postgresql://wms_user:wms_secure_password_2025@localhost:5432/wms_production"

# 5. Run database migrations
npx prisma generate
npx prisma db push --skip-generate

# 6. Stop any existing PM2 processes
pm2 kill

# 7. Start application with PM2
pm2 start server.js --name wms-app --max-memory-restart 1G
pm2 save
pm2 startup systemd -u wms --hp /home/wms

# 8. Create admin user
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@2025!', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@targonglobal.com' },
      update: {},
      create: {
        email: 'admin@targonglobal.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    console.log('Admin user ready:', admin.email);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.\$disconnect();
  }
}
createAdmin();
"

# 9. Verify application is running
sleep 5
pm2 list
curl -I http://localhost:3000

# 10. Restart Nginx
sudo systemctl restart nginx

echo "Deployment completed!"
EOF