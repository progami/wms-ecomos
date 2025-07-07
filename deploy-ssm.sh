#\!/bin/bash
# Download deployment
cd /home/wms
sudo -u wms wget -q -O deploy-new.tar.gz 'https://wms-deploy-1751875198.s3.us-east-1.amazonaws.com/deploy-new.tar.gz?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAWV36AUWTHQOZ3OH5%2F20250707%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250707T173051Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=1d6970ca406145c6797ef0695a25069fc3deb6702edcb2bb29753aed71da228e'

# Extract to app directory
sudo -u wms rm -rf app
sudo -u wms mkdir -p app
cd app
sudo -u wms tar -xzf ../deploy-new.tar.gz

# Create server.js for PM2
sudo -u wms cat > server.js << 'SERVERJS'
const { exec } = require('child_process');
const PORT = process.env.PORT || 3000;

// Start Next.js server
const nextProcess = exec('npm run start', (error) => {
  if (error) {
    console.error('Next.js server error:', error);
    process.exit(1);
  }
});

nextProcess.stdout.on('data', (data) => {
  console.log(data.toString());
});

nextProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

process.on('SIGTERM', () => {
  nextProcess.kill();
  process.exit(0);
});
SERVERJS

# Install production dependencies
sudo -u wms npm ci --production

# Run database migrations
sudo -u wms npx prisma migrate deploy || true

# Stop existing PM2 processes
sudo -u wms pm2 stop all || true
sudo -u wms pm2 delete all || true

# Start with PM2
sudo -u wms NODE_ENV=production pm2 start server.js --name wms-app
sudo -u wms pm2 save

# Verify application is running
sleep 10
curl -s http://localhost:3000 > /dev/null && echo "Application started successfully" || echo "Application failed to start"
EOF < /dev/null