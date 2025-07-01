#!/bin/bash

EC2_DNS="ec2-54-174-226-39.compute-1.amazonaws.com"

echo "==========================================="
echo "WMS Deployment Setup"
echo "==========================================="
echo
echo "✅ Old SSH key deleted: targon-ec2.pem"
echo "✅ Using DNS instead of IP"
echo
echo "📋 Add these GitHub Secrets:"
echo "   https://github.com/progami/WMS_EcomOS/settings/secrets/actions/new"
echo
echo "1. Secret: EC2_DNS"
echo "   Value: $EC2_DNS"
echo
echo "2. Secret: EC2_SSH_KEY"
echo "   Value: (copy everything below)"
echo "----------------------------------------"
cat ~/.ssh/wms-prod
echo "----------------------------------------"
echo
echo "🚀 To Deploy:"
echo "   git push origin main"
echo
echo "📡 Access Methods:"
echo "   SSH: ssh -i ~/.ssh/wms-prod ubuntu@$EC2_DNS"
echo "   Web: http://$EC2_DNS"
echo
echo "✨ Benefits of using DNS:"
echo "   - Survives IP changes"
echo "   - Better for scripts"
echo "   - Easier to remember"