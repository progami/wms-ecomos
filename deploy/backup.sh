#!/bin/bash
# WMS Daily Backup Script
# This script backs up the database and uploaded files to local storage and S3

set -e

# Configuration
BACKUP_DIR="/home/ubuntu/backups"
S3_BUCKET="targonglobal-wms-backups"  # Change this to your S3 bucket
APP_DIR="/var/www/wms"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Database credentials (loaded from environment)
source /home/ubuntu/.env.production
DB_NAME="wms_production"
DB_USER="wms_user"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR/db"
mkdir -p "$BACKUP_DIR/files"

echo -e "${YELLOW}🔄 Starting WMS backup process...${NC}"

# 1. Backup PostgreSQL database
echo -e "${YELLOW}📊 Backing up database...${NC}"
export PGPASSWORD="${DATABASE_URL##*:}"
export PGPASSWORD="${PGPASSWORD%%@*}"

pg_dump -h localhost -U $DB_USER -d $DB_NAME --no-password > "$BACKUP_DIR/db/wms_db_$DATE.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database backup completed${NC}"
    # Compress the backup
    gzip "$BACKUP_DIR/db/wms_db_$DATE.sql"
else
    echo -e "${RED}❌ Database backup failed${NC}"
    exit 1
fi

# 2. Backup uploaded files and logs
echo -e "${YELLOW}📁 Backing up application files...${NC}"
if [ -d "$APP_DIR/public/uploads" ]; then
    tar -czf "$BACKUP_DIR/files/wms_uploads_$DATE.tar.gz" -C "$APP_DIR/public" uploads/
    echo -e "${GREEN}✅ File backup completed${NC}"
fi

# Backup logs
if [ -d "$APP_DIR/logs" ]; then
    tar -czf "$BACKUP_DIR/files/wms_logs_$DATE.tar.gz" -C "$APP_DIR" logs/
    echo -e "${GREEN}✅ Log backup completed${NC}"
fi

# 3. Upload to S3 (if AWS CLI is configured)
if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
    echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
    
    # Upload database backup
    aws s3 cp "$BACKUP_DIR/db/wms_db_$DATE.sql.gz" "s3://$S3_BUCKET/db/" --storage-class STANDARD_IA
    
    # Upload file backups
    if [ -f "$BACKUP_DIR/files/wms_uploads_$DATE.tar.gz" ]; then
        aws s3 cp "$BACKUP_DIR/files/wms_uploads_$DATE.tar.gz" "s3://$S3_BUCKET/files/" --storage-class STANDARD_IA
    fi
    
    if [ -f "$BACKUP_DIR/files/wms_logs_$DATE.tar.gz" ]; then
        aws s3 cp "$BACKUP_DIR/files/wms_logs_$DATE.tar.gz" "s3://$S3_BUCKET/logs/" --storage-class STANDARD_IA
    fi
    
    echo -e "${GREEN}✅ S3 upload completed${NC}"
else
    echo -e "${YELLOW}⚠️  S3 upload skipped (AWS CLI not configured or S3_BUCKET not set)${NC}"
fi

# 4. Clean up old backups (local)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
find "$BACKUP_DIR/db" -name "wms_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/files" -name "wms_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 5. Clean up old S3 backups (if configured)
if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
    # List and delete old S3 objects
    aws s3 ls "s3://$S3_BUCKET/db/" | while read -r line; do
        createDate=$(echo $line | awk '{print $1" "$2}')
        createDate=$(date -d "$createDate" +%s)
        olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
        if [[ $createDate -lt $olderThan ]]; then
            fileName=$(echo $line | awk '{print $4}')
            if [ ! -z "$fileName" ]; then
                aws s3 rm "s3://$S3_BUCKET/db/$fileName"
            fi
        fi
    done
fi

# 6. Generate backup report
BACKUP_SIZE_DB=$(du -h "$BACKUP_DIR/db/wms_db_$DATE.sql.gz" 2>/dev/null | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.gz" -type f | wc -l)

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "📊 Backup Summary:"
echo "   - Database backup: $BACKUP_SIZE_DB"
echo "   - Total backups stored: $BACKUP_COUNT"
echo "   - Backup location: $BACKUP_DIR"
echo "   - S3 bucket: $S3_BUCKET"

# 7. Send notification (optional - requires mail setup)
# echo "WMS backup completed successfully at $(date)" | mail -s "WMS Backup Success" admin@targonglobal.com

# Log the backup
echo "$(date): Backup completed successfully" >> /var/log/wms-backup.log