#\!/bin/bash
# Final deployment script for WMS

INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=WMS-TEST-IaC" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Deploying to: $INSTANCE_ID ($INSTANCE_IP)"

# Build locally
echo "Building application..."
npm run build

# Create deployment package
tar -czf deploy-final.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='logs/*' \
  --exclude='.env*' \
  .

# Upload to S3
BUCKET="wms-deploy-$(date +%s)"
aws s3 mb s3://$BUCKET
aws s3 cp deploy-final.tar.gz s3://$BUCKET/
URL=$(aws s3 presign s3://$BUCKET/deploy-final.tar.gz --expires-in 3600)

# Deploy via SSM
aws ssm send-command \
  --instance-ids $INSTANCE_ID \
  --document-name "AWS-RunShellScript" \
  --parameters "{\"commands\":[
    \"cd /home/wms\",
    \"sudo -u wms wget -q -O deploy.tar.gz '$URL'\",
    \"sudo -u wms pm2 delete all || true\",
    \"sudo rm -rf app\",
    \"sudo -u wms mkdir app\",
    \"sudo -u wms tar -xzf deploy.tar.gz -C app\",
    \"cd app\",
    \"echo 'DATABASE_URL=\\\"postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production\\\"' > .env\",
    \"echo 'NEXTAUTH_URL=\\\"http://$INSTANCE_IP:3000\\\"' >> .env\",
    \"echo 'NEXTAUTH_SECRET=\\\"production_secret_key_change_in_production_123456\\\"' >> .env\",
    \"echo 'NODE_ENV=\\\"production\\\"' >> .env\",
    \"echo 'PORT=3000' >> .env\",
    \"sudo chown wms:wms .env\",
    \"sudo -u wms npm ci --production\",
    \"sudo -u wms PORT=3000 pm2 start server.js --name wms-app\",
    \"sudo -u wms pm2 save\",
    \"sleep 10\",
    \"curl -I http://localhost:3000/auth/login\"
  ]}" \
  --timeout-seconds 600

# Cleanup
sleep 60
aws s3 rm s3://$BUCKET/deploy-final.tar.gz
aws s3 rb s3://$BUCKET

echo "Deployment complete\!"
echo "Application URL: http://$INSTANCE_IP:3000"
echo "Login page: http://$INSTANCE_IP:3000/auth/login"
