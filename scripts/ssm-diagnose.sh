#!/bin/bash

# Comprehensive diagnostics for WMS deployment

INSTANCE_ID="i-0fb1f56a90fe95bac"
REGION="us-east-1"

echo "🔍 Running comprehensive diagnostics on $INSTANCE_ID"

# Send diagnostic commands
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --region "$REGION" \
    --timeout-seconds 300 \
    --parameters '{
        "commands": [
            "#!/bin/bash",
            "",
            "echo \"=== System Information ===\"",
            "uname -a",
            "echo \"\"",
            "",
            "echo \"=== Network Configuration ===\"", 
            "ip addr show",
            "echo \"\"",
            "sudo iptables -L -n | head -20",
            "echo \"\"",
            "",
            "echo \"=== Port Listening Status ===\"",
            "sudo netstat -tlnp",
            "echo \"\"",
            "",
            "echo \"=== Process Status ===\"",
            "ps aux | grep -E \"node|pm2|nginx\" | grep -v grep",
            "echo \"\"",
            "",
            "echo \"=== PM2 Status ===\"",
            "which pm2 && pm2 status || echo \"PM2 not found\"",
            "echo \"\"",
            "",
            "echo \"=== Application Directory ===\"",
            "cd /var/www/wms && pwd",
            "ls -la",
            "echo \"\"",
            "",
            "echo \"=== Environment File ===\"",
            "cat .env.production",
            "echo \"\"",
            "",
            "echo \"=== Node.js Version ===\"",
            "node --version",
            "npm --version", 
            "echo \"\"",
            "",
            "echo \"=== Build Status ===\"",
            "[ -d \".next\" ] && echo \".next directory exists\" || echo \".next directory NOT FOUND\"",
            "[ -d \"node_modules\" ] && echo \"node_modules exists\" || echo \"node_modules NOT FOUND\"",
            "echo \"\"",
            "",
            "echo \"=== Nginx Configuration ===\"",
            "cat /etc/nginx/sites-enabled/wms 2>/dev/null || echo \"No nginx config\"",
            "echo \"\"",
            "sudo nginx -t",
            "echo \"\"",
            "",
            "echo \"=== Direct Node Test ===\"",
            "cd /var/www/wms",
            "timeout 5 npm start 2>&1 | head -20 || echo \"Direct start failed\"",
            "echo \"\"",
            "",
            "echo \"=== PM2 Logs ===\"",
            "pm2 logs --lines 30 --nostream 2>&1 || echo \"No PM2 logs\"",
            "echo \"\"",
            "",
            "echo \"=== System Logs ===\"",
            "sudo journalctl -u nginx -n 20 --no-pager",
            "echo \"\"",
            "sudo tail -30 /var/log/syslog | grep -E \"node|pm2|npm\"",
            "",
            "echo \"=== Diagnostics Complete ===\""
        ],
        "workingDirectory": ["/home/ubuntu"],
        "executionTimeout": ["300"]
    }' \
    --output text \
    --query 'Command.CommandId')

echo "Command ID: $COMMAND_ID"
echo "⏳ Running diagnostics..."

# Wait for completion
sleep 20

STATUS=$(aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Status' \
    --output text 2>/dev/null)

echo "Status: $STATUS"

# Save output to file
OUTPUT_FILE="/tmp/wms-diagnostics-$(date +%Y%m%d-%H%M%S).txt"

if [ "$STATUS" = "Success" ]; then
    echo ""
    echo "📋 Diagnostic Results:"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardOutputContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null > "$OUTPUT_FILE"
    
    cat "$OUTPUT_FILE"
    echo ""
    echo "✅ Diagnostics saved to: $OUTPUT_FILE"
else
    echo "❌ Diagnostics failed!"
    aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --query 'StandardErrorContent' \
        --output text 2>/dev/null | base64 -d 2>/dev/null
fi