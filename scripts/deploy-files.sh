#!/bin/bash

echo "Copying essential files to EC2..."

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

# Create package.json
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        \"cd /var/www/wms\",
        \"cat > package.json << 'EOF'
$(cat package.json)
EOF\"
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId'

sleep 5

# Create server.js
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        \"cd /var/www/wms\",
        \"cat > server.js << 'EOF'
$(cat server.js)
EOF\"
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId'

sleep 5

# Create next.config.js
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        \"cd /var/www/wms\",
        \"cat > next.config.js << 'EOF'
$(cat next.config.js)
EOF\"
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId'

sleep 5

# Create prisma schema
aws ssm send-command \
    --instance-ids $INSTANCE_ID \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[
        \"cd /var/www/wms\",
        \"mkdir -p prisma\",
        \"cat > prisma/schema.prisma << 'EOF'
$(cat prisma/schema.prisma)
EOF\"
    ]" \
    --region $REGION \
    --output text --query 'Command.CommandId'

echo "Files copied. Now run npm install and build on the server."