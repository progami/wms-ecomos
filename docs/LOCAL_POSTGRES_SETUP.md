# Local PostgreSQL Setup for EC2

This guide explains how WMS uses PostgreSQL locally on the EC2 instance instead of RDS.

## Benefits

1. **Cost**: Free (no RDS charges)
2. **Performance**: No network latency
3. **Simplicity**: Everything on one server
4. **Control**: Direct database access

## How It Works

The `deploy.sh` script automatically:

1. Installs PostgreSQL on your EC2 instance
2. Creates a secure database password
3. Sets up the `wms_production` database
4. Creates the `wms_admin` user
5. Configures the connection string

## Manual Setup (if needed)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Access PostgreSQL as postgres user
sudo -u postgres psql

# Create database and user
CREATE USER wms_admin WITH PASSWORD 'your-secure-password';
CREATE DATABASE wms_production OWNER wms_admin;
GRANT ALL PRIVILEGES ON DATABASE wms_production TO wms_admin;
\q

# Test connection
psql -h localhost -U wms_admin -d wms_production
```

## Backup and Maintenance

### Daily Backups
```bash
# The deploy script creates a backup script
~/backup-wms.sh
```

### Manual Backup
```bash
pg_dump -h localhost -U wms_admin wms_production > backup-$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
psql -h localhost -U wms_admin wms_production < backup-20240101.sql
```

## PostgreSQL Configuration

The default PostgreSQL configuration works well for small to medium deployments. For optimization:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/*/main/postgresql.conf

# Recommended settings for 2GB RAM EC2:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

## Monitoring

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/*.log

# Database size
sudo -u postgres psql -c "SELECT pg_database_size('wms_production');"

# Active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

## Security

1. PostgreSQL only listens on localhost (default)
2. Password authentication required
3. No external access (only through app)
4. Regular backups to S3 (optional)

## Troubleshooting

### Connection refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Authentication failed
```bash
# Reset password
sudo -u postgres psql
ALTER USER wms_admin WITH PASSWORD 'new-password';
# Update .env.production with new password
```

### Disk space issues
```bash
# Check disk usage
df -h
# Clean old logs
sudo -u postgres vacuumdb --all --analyze
```