#!/bin/bash
# Quick status check commands

echo "=== Quick WMS Status Check Commands ==="
echo ""
echo "Run these commands to quickly check the deployment status:"
echo ""

echo "1. Check PM2 environment variables:"
echo "aws ssm send-command --instance-ids i-07b6b80ad1cbbc40f --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"cd /home/wms/wms-app && pm2 env 0 | grep -E \\\"(BASE_PATH|PORT|NODE_ENV)\\\"\"]' --query 'Command.CommandId' --output text"
echo ""

echo "2. Check if app is running:"
echo "aws ssm send-command --instance-ids i-07b6b80ad1cbbc40f --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"pm2 list && curl -s -o /dev/null -w \\\"%{http_code}\\\" http://127.0.0.1:3000/\"]' --query 'Command.CommandId' --output text"
echo ""

echo "3. Check Nginx config:"
echo "aws ssm send-command --instance-ids i-07b6b80ad1cbbc40f --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"nginx -T 2>&1 | grep -A 10 -B 5 \\\"/WMS\\\"\"]' --query 'Command.CommandId' --output text"
echo ""

echo "4. Quick fix - Just update PM2 environment:"
echo "aws ssm send-command --instance-ids i-07b6b80ad1cbbc40f --document-name \"AWS-RunShellScript\" --parameters 'commands=[\"cd /home/wms/wms-app && pm2 restart wms-app --update-env -- --env BASE_PATH=/WMS NEXT_PUBLIC_BASE_PATH=/WMS\"]' --query 'Command.CommandId' --output text"
echo ""

echo "To get command results, use:"
echo "aws ssm get-command-invocation --command-id <COMMAND_ID> --instance-id i-07b6b80ad1cbbc40f --query 'StandardOutputContent' --output text"