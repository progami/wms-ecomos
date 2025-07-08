#!/bin/bash
# Update DNS to point to the working instance

echo "=== Updating DNS to point to working WMS instance ==="
echo "Current: 44.198.217.24 (not working)"
echo "New: 54.204.215.11 (working with /WMS path)"

# Since you're using Cloudflare, not Route 53, you need to update the DNS records in Cloudflare
echo ""
echo "Please update the following DNS records in Cloudflare:"
echo ""
echo "1. A record for targonglobal.com -> 54.204.215.11"
echo "2. A record for www.targonglobal.com -> 54.204.215.11"
echo ""
echo "The instance at 54.204.215.11 already has:"
echo "- WMS application running"
echo "- Configured for /WMS path"
echo "- SSL certificates installed"
echo "- Nginx properly configured"
echo ""
echo "After updating DNS, the application will be accessible at https://targonglobal.com/WMS"