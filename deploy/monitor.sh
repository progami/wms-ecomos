#!/bin/bash
# WMS Health Monitoring Script
# Can be run manually or via cron for regular health checks

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🏥 WMS Health Check Report"
echo "========================="
echo "Time: $(date)"
echo ""

# 1. Check if services are running
echo "📊 Service Status:"

# Check PM2
if pm2 status | grep -q "wms-app.*online"; then
    echo -e "  ✅ PM2: ${GREEN}Running${NC}"
else
    echo -e "  ❌ PM2: ${RED}Not running${NC}"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "  ✅ Nginx: ${GREEN}Active${NC}"
else
    echo -e "  ❌ Nginx: ${RED}Inactive${NC}"
fi

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "  ✅ PostgreSQL: ${GREEN}Active${NC}"
else
    echo -e "  ❌ PostgreSQL: ${RED}Inactive${NC}"
fi

echo ""

# 2. Check application health endpoint
echo "🌐 Application Health:"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "  ✅ API Health: ${GREEN}OK${NC}"
    curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/health
else
    echo -e "  ❌ API Health: ${RED}Failed (HTTP $HEALTH_RESPONSE)${NC}"
fi

echo ""

# 3. System resources
echo "💻 System Resources:"

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
echo "  CPU Usage: $CPU_USAGE%"

# Memory usage
MEMORY_INFO=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
MEMORY_AVAILABLE=$(free -m | awk 'NR==2{printf "%sMB", $7}')
echo "  Memory Usage: $MEMORY_INFO (Available: $MEMORY_AVAILABLE)"

# Disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')
echo "  Disk Usage: $DISK_USAGE (Available: $DISK_AVAILABLE)"

echo ""

# 4. Database status
echo "🗄️  Database Status:"
DB_SIZE=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('wms_production'));" 2>/dev/null | xargs)
DB_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'wms_production';" 2>/dev/null | xargs)
echo "  Database Size: $DB_SIZE"
echo "  Active Connections: $DB_CONNECTIONS"

echo ""

# 5. Recent errors
echo "⚠️  Recent Errors (last 10):"
if [ -f /var/log/pm2/wms-error.log ]; then
    tail -n 10 /var/log/pm2/wms-error.log | grep -E "(ERROR|Error|error)" || echo "  No recent errors found"
else
    echo "  Error log not found"
fi

echo ""

# 6. Backup status
echo "💾 Backup Status:"
LATEST_BACKUP=$(ls -t /home/ubuntu/backups/db/*.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$((($(date +%s) - $(date +%s -r "$LATEST_BACKUP")) / 3600))
    echo "  Latest backup: $(basename $LATEST_BACKUP)"
    echo "  Backup age: ${BACKUP_AGE} hours"
    if [ $BACKUP_AGE -gt 24 ]; then
        echo -e "  ${YELLOW}⚠️  Warning: Backup is older than 24 hours${NC}"
    fi
else
    echo -e "  ${RED}❌ No backups found${NC}"
fi

echo ""
echo "========================="

# Optional: Send alert if critical issues found
# You can add email/Slack notifications here