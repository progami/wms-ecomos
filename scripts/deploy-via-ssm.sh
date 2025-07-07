#!/bin/bash
set -e

INSTANCE_ID="$1"
if [ -z "$INSTANCE_ID" ]; then
    echo "Usage: $0 <instance-id>"
    exit 1
fi

echo "Deploying to instance: $INSTANCE_ID"

# Create deployment script
DEPLOY_SCRIPT='cd /home/wms
sudo -u wms git clone https://github.com/progami/WMS_EcomOS.git app || (cd app && sudo -u wms git pull origin main)
cd /home/wms/app
cat > /home/wms/app/.env << ENVFILE
DATABASE_URL="postgresql://wms:wms_secure_password_2024@localhost:5432/wms_production"
NEXTAUTH_URL="http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
NEXTAUTH_SECRET="production_secret_key_change_in_production"
NODE_ENV="production"
DEMO_ADMIN_PASSWORD="SecureWarehouse2024!"
DEMO_STAFF_PASSWORD="DemoStaff2024!"
PORT=3000
ENVFILE
chown wms:wms /home/wms/app/.env
sudo -u wms npm ci
sudo -u wms npx prisma generate
if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations)" ]; then sudo -u wms npx prisma migrate deploy; else sudo -u wms npx prisma db push --skip-generate; fi
sudo -u wms npx prisma db seed || true
sudo -u wms npm run build
sudo -u wms pm2 delete wms-app || true
sudo -u wms PORT=3000 pm2 start npm --name wms-app -- start
sudo -u wms pm2 save
sudo systemctl restart nginx
sleep 5
curl -s http://localhost:3000/api/health && echo " - App is healthy!" || echo " - App health check failed"'

# Send command
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "{\"commands\":[\"$DEPLOY_SCRIPT\"]}" \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "Waiting for deployment to complete..."

# Wait for command to complete
while true; do
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --query 'Status' \
        --output text 2>/dev/null || echo "Pending")
    
    if [ "$STATUS" = "Success" ]; then
        echo "Deployment completed successfully!"
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --query 'StandardOutputContent' \
            --output text
        break
    elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Cancelled" ] || [ "$STATUS" = "TimedOut" ]; then
        echo "Deployment failed with status: $STATUS"
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --query 'StandardErrorContent' \
            --output text
        exit 1
    fi
    
    sleep 10
done

# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "Deployment complete!"
echo "Application URL: http://$INSTANCE_IP:3000"
echo "Login: admin@warehouse.com / SecureWarehouse2024!"