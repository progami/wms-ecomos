#!/bin/bash

# EC2 Instance ID
INSTANCE_ID="i-065d0aa80cdcd55b1"
REGION="us-east-1"

echo "Starting WMS deployment to EC2 instance $INSTANCE_ID"

# Function to execute SSM command and wait for completion
execute_ssm_command() {
    local commands="$1"
    local description="$2"
    
    echo "Executing: $description"
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids "$INSTANCE_ID" \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=$commands" \
        --region "$REGION" \
        --output text \
        --query "Command.CommandId")
    
    if [ -z "$COMMAND_ID" ]; then
        echo "Failed to execute command"
        return 1
    fi
    
    echo "Command ID: $COMMAND_ID"
    
    # Wait for command to complete
    echo "Waiting for command to complete..."
    aws ssm wait command-executed \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" 2>/dev/null || true
    
    # Get command output
    STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query "Status" \
        --output text)
    
    echo "Status: $STATUS"
    
    if [ "$STATUS" != "Success" ]; then
        echo "Command failed. Getting error details..."
        aws ssm get-command-invocation \
            --command-id "$COMMAND_ID" \
            --instance-id "$INSTANCE_ID" \
            --region "$REGION" \
            --query "StandardErrorContent" \
            --output text
        return 1
    fi
    
    return 0
}

# Step 1: Prepare EC2 instance
execute_ssm_command '[
    "sudo mkdir -p /tmp/wms-deploy",
    "sudo chmod 777 /tmp/wms-deploy",
    "cd /tmp/wms-deploy",
    "sudo rm -rf /tmp/wms-deploy/*"
]' "Preparing deployment directory"

# Step 2: Transfer file in chunks
echo "Transferring file chunks to EC2..."
CHUNK_FILES=$(ls /tmp/wms-chunk-* 2>/dev/null)
TOTAL_CHUNKS=$(echo "$CHUNK_FILES" | wc -l)
CURRENT_CHUNK=0

for chunk in $CHUNK_FILES; do
    CURRENT_CHUNK=$((CURRENT_CHUNK + 1))
    chunk_name=$(basename "$chunk")
    echo "Transferring chunk $CURRENT_CHUNK of $TOTAL_CHUNKS: $chunk_name"
    
    # Read chunk content and escape it properly
    chunk_content=$(cat "$chunk" | sed 's/"/\\"/g' | sed "s/'/\\'/g")
    
    # Create a temporary script to handle the chunk
    execute_ssm_command "[
        \"cat > /tmp/wms-deploy/$chunk_name << 'EOF'\",
        \"$chunk_content\",
        \"EOF\"
    ]" "Transfer $chunk_name"
done

# Step 3: Combine, extract, and deploy
echo "Deploying application..."
execute_ssm_command '[
    "cd /tmp/wms-deploy",
    "echo \"Combining chunks...\"",
    "cat wms-chunk-* > wms-src.tar.gz.b64",
    "echo \"Decoding base64...\"",
    "base64 -d wms-src.tar.gz.b64 > wms-src.tar.gz",
    "echo \"Extracting archive...\"",
    "sudo rm -rf /var/www/wms/*",
    "sudo tar -xzf wms-src.tar.gz -C /var/www/wms",
    "sudo chown -R ubuntu:ubuntu /var/www/wms",
    "echo \"Archive extracted successfully\""
]' "Extract application files"

# Step 4: Setup environment
execute_ssm_command '[
    "cd /var/www/wms",
    "echo \"Creating .env file...\"",
    "cat > .env << '\''EOF'\''",
    "NODE_ENV=production",
    "PORT=3000",
    "DATABASE_URL=postgresql://wms_user:wms_password@localhost:5432/wms_db",
    "JWT_SECRET=your-secret-key-here-change-in-production",
    "SESSION_SECRET=your-session-secret-here-change-in-production",
    "CORS_ORIGIN=http://3.87.244.116:3000",
    "EOF",
    "echo \".env file created\""
]' "Setup environment variables"

# Step 5: Install dependencies
execute_ssm_command '[
    "cd /var/www/wms",
    "echo \"Installing dependencies...\"",
    "npm install --production=false",
    "echo \"Dependencies installed\""
]' "Install dependencies"

# Step 6: Build application
execute_ssm_command '[
    "cd /var/www/wms",
    "echo \"Building application...\"",
    "npm run build",
    "echo \"Build completed\""
]' "Build application"

# Step 7: Run migrations
execute_ssm_command '[
    "cd /var/www/wms",
    "echo \"Running database migrations...\"",
    "npx knex migrate:latest --env production",
    "echo \"Migrations completed\""
]' "Run database migrations"

# Step 8: Setup and start PM2
execute_ssm_command '[
    "cd /var/www/wms",
    "echo \"Setting up PM2...\"",
    "pm2 delete all || true",
    "pm2 start npm --name wms -- start",
    "pm2 save",
    "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu",
    "echo \"PM2 setup completed\""
]' "Setup PM2"

# Step 9: Verify deployment
execute_ssm_command '[
    "echo \"Checking application status...\"",
    "pm2 status",
    "echo \"Testing application endpoint...\"",
    "sleep 5",
    "curl -I http://localhost:3000 || echo \"Application may still be starting...\"",
    "echo \"Checking nginx status...\"",
    "sudo systemctl status nginx --no-pager"
]' "Verify deployment"

# Cleanup
execute_ssm_command '[
    "rm -rf /tmp/wms-deploy",
    "echo \"Cleanup completed\""
]' "Cleanup temporary files"

echo ""
echo "Deployment process completed!"
echo "Application should be accessible at: http://3.87.244.116:3000"
echo ""
echo "To check application logs:"
echo "aws ssm send-command --instance-ids $INSTANCE_ID --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 logs wms --lines 50\"]' --region $REGION"