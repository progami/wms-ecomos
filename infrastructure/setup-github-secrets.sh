#!/bin/bash

echo "==========================================="
echo "GitHub Actions Setup"
echo "==========================================="
echo

# Get instance IP
INSTANCE_IP=$(cd terraform/environments/prod && terraform output -raw instance_ip 2>/dev/null)

if [ -z "$INSTANCE_IP" ]; then
  echo "❌ No infrastructure found. Run 'make provision' first."
  exit 1
fi

echo "Current EC2 Instance: $INSTANCE_IP"
echo

echo "📋 To enable GitHub Actions deployment:"
echo
echo "1. Go to your GitHub repository settings:"
echo "   https://github.com/YOUR_USERNAME/WMS/settings/secrets/actions"
echo
echo "2. Add these repository secrets:"
echo
echo "   EC2_HOST"
echo "   Value: $INSTANCE_IP"
echo
echo "   EC2_SSH_KEY"
echo "   Value: (copy the content below)"
echo "   ----------------------------------------"
cat ~/.ssh/wms-prod
echo "   ----------------------------------------"
echo
echo "3. Deployment will trigger automatically when you:"
echo "   - Push to main branch"
echo "   - Or manually trigger via Actions tab"
echo
echo "4. Monitor deployment:"
echo "   https://github.com/YOUR_USERNAME/WMS/actions"
echo

# Create manual deployment instructions
cat > deploy-instructions.md << EOF
# WMS Deployment Instructions

## GitHub Actions Deployment (Automated)

### Prerequisites
1. AWS infrastructure created: \`make provision\`
2. GitHub secrets configured (see below)

### GitHub Secrets Required
- **EC2_HOST**: $INSTANCE_IP
- **EC2_SSH_KEY**: Contents of ~/.ssh/wms-prod

### Deployment Triggers
- Push to main branch
- Manual trigger from Actions tab

### Manual EC2 Setup (if needed)
\`\`\`bash
# SSH into EC2
ssh -i ~/.ssh/wms-prod ubuntu@$INSTANCE_IP

# Verify services
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check deployment readiness
ls -la /var/www/wms/
\`\`\`

## Monitoring
- Application URL: http://$INSTANCE_IP
- GitHub Actions: https://github.com/YOUR_USERNAME/WMS/actions
- EC2 Logs: \`ssh -i ~/.ssh/wms-prod ubuntu@$INSTANCE_IP 'pm2 logs wms'\`
EOF

echo "📄 Created deploy-instructions.md with detailed setup information"