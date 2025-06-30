#!/bin/bash

# WMS Comprehensive AWS Deployment Script
# This single script handles the entire deployment process

set -e

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/wms-deploy-$(date +%Y%m%d-%H%M%S).log"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✓ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠ $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ $1${NC}"
}

# Prompt for input with default value
prompt() {
    local prompt_text="$1"
    local default_value="$2"
    local var_name="$3"
    
    if [ -n "$default_value" ]; then
        read -p "$prompt_text [$default_value]: " input_value
        eval "$var_name=${input_value:-$default_value}"
    else
        read -p "$prompt_text: " input_value
        eval "$var_name=$input_value"
    fi
}

# Check if running on Ubuntu
check_ubuntu() {
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            warning "Running on macOS - this script is designed for Ubuntu deployment"
            warning "Use this for local testing only or run on your EC2 instance"
            read -p "Continue anyway? (y/n): " continue_anyway
            [[ ! $continue_anyway =~ ^[Yy]$ ]] && exit 0
        else
            error_exit "This script is designed for Ubuntu. Please use Ubuntu 22.04 LTS."
        fi
    fi
}

# Install system dependencies
install_dependencies() {
    info "Installing system dependencies..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update
        sudo apt install -y curl git build-essential nginx postgresql postgresql-contrib jq
        
        # Install Node.js 18.x
        if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt install -y nodejs
        fi
        
        # Install PM2
        if ! command -v pm2 &> /dev/null; then
            sudo npm install -g pm2
        fi
        
        success "Dependencies installed"
    else
        warning "Skipping system dependencies on non-Linux system"
    fi
}

# Setup application directory
setup_app_directory() {
    if [[ "$DEPLOYMENT_TYPE" == "production" ]] && [[ "$OSTYPE" == "linux-gnu"* ]]; then
        info "Setting up application directory..."
        sudo mkdir -p /var/www/wms
        sudo chown -R $USER:$USER /var/www/wms
        APP_DIR="/var/www/wms"
        
        # Create logs directory
        mkdir -p "$APP_DIR/logs"
        chmod 755 "$APP_DIR/logs"
    else
        APP_DIR="$PROJECT_ROOT"
        info "Using current directory for deployment: $APP_DIR"
        
        # Create logs directory
        mkdir -p "$APP_DIR/logs"
        chmod 755 "$APP_DIR/logs"
    fi
}

# Clone or update repository
setup_repository() {
    if [[ "$APP_DIR" != "$PROJECT_ROOT" ]]; then
        info "Setting up repository..."
        
        if [ -d "$APP_DIR/.git" ]; then
            cd "$APP_DIR"
            git pull origin main
        else
            prompt "Enter your Git repository URL" "" GIT_REPO
            git clone "$GIT_REPO" "$APP_DIR"
            cd "$APP_DIR"
        fi
    else
        info "Using existing repository"
        cd "$APP_DIR"
    fi
}

# Generate secure passwords
generate_passwords() {
    info "Generating secure passwords..."
    
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    STAFF_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    
    success "Passwords generated"
}

# Setup environment file
setup_environment() {
    info "Setting up environment configuration..."
    
    local env_file=".env.${DEPLOYMENT_TYPE}"
    
    if [ -f "$env_file" ]; then
        warning "Environment file already exists: $env_file"
        read -p "Overwrite existing configuration? (y/n): " overwrite
        [[ ! $overwrite =~ ^[Yy]$ ]] && return
    fi
    
    # Get configuration values
    if [[ "$DEPLOYMENT_TYPE" == "production" ]]; then
        info "Setting up local PostgreSQL database..."
        
        # Install PostgreSQL if not already installed
        if ! command -v psql &> /dev/null; then
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        fi
        
        # Generate secure database password
        DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
        
        # Create database and user
        sudo -u postgres psql << EOF 2>/dev/null || true
CREATE USER wms_admin WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE wms_production OWNER wms_admin;
GRANT ALL PRIVILEGES ON DATABASE wms_production TO wms_admin;
EOF
        
        # Check if database was created successfully
        if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw wms_production; then
            error_exit "Failed to create PostgreSQL database"
        fi
        
        prompt "Enter your domain name (e.g., targongglobal.com)" "" DOMAIN_NAME
        
        DATABASE_URL="postgresql://wms_admin:${DB_PASSWORD}@localhost:5432/wms_production"
        APP_URL="https://${DOMAIN_NAME}/wms"
    else
        DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wms_dev"
        APP_URL="http://localhost:3000"
        DOMAIN_NAME="localhost"
    fi
    
    # Create environment file
    cat > "$env_file" << EOF
# ${DEPLOYMENT_TYPE^} Environment Variables
NODE_ENV=${DEPLOYMENT_TYPE}

# Database
DATABASE_URL=${DATABASE_URL}

# NextAuth
NEXTAUTH_URL=${APP_URL}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Application
NEXT_PUBLIC_APP_URL=${APP_URL}
PORT=3000

# Authentication
DEMO_ADMIN_PASSWORD=${ADMIN_PASSWORD}
DEMO_STAFF_PASSWORD=${STAFF_PASSWORD}

# Logging
LOG_LEVEL=info
LOG_DIR=${APP_DIR}/logs

# AWS (Optional - for backups)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# S3_BACKUP_BUCKET=wms-backups
EOF

    if [[ "$DEPLOYMENT_TYPE" == "development" ]]; then
        cat >> "$env_file" << EOF

# Development only - DO NOT SET IN PRODUCTION
NEXT_PUBLIC_DEMO_PASSWORD=demo123
NEXT_PUBLIC_ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEXT_PUBLIC_STAFF_PASSWORD=${STAFF_PASSWORD}
EOF
    fi
    
    success "Environment file created: $env_file"
    
    # Save credentials
    cat > "${APP_DIR}/credentials-${DEPLOYMENT_TYPE}.txt" << EOF
WMS ${DEPLOYMENT_TYPE^} Credentials
Generated: $(date)

Admin Login:
  Email: admin@example.com
  Password: ${ADMIN_PASSWORD}

Staff Login:
  Email: staff1@example.com
  Password: ${STAFF_PASSWORD}

NextAuth Secret: ${NEXTAUTH_SECRET}

Database URL: ${DATABASE_URL}

IMPORTANT: Store these credentials securely and delete this file after saving them.
EOF
    
    chmod 600 "${APP_DIR}/credentials-${DEPLOYMENT_TYPE}.txt"
    warning "Credentials saved to: ${APP_DIR}/credentials-${DEPLOYMENT_TYPE}.txt"
    warning "IMPORTANT: Save these credentials securely and delete the file!"
}

# Build application
build_application() {
    info "Building application..."
    
    cd "$APP_DIR"
    
    # Install dependencies
    npm install --production=false
    
    # Run database migrations
    if [[ "$DEPLOYMENT_TYPE" == "production" ]]; then
        info "Running database migrations..."
        # Load environment variables from production file
        export $(grep -v '^#' .env.production | xargs)
        npm run db:generate
        npm run db:push
    fi
    
    # Build for production
    npm run build
    
    success "Application built successfully"
}

# Setup PM2
setup_pm2() {
    if [[ "$DEPLOYMENT_TYPE" == "production" ]] && command -v pm2 &> /dev/null; then
        info "Setting up PM2 process manager..."
        
        # Copy ecosystem config from deploy folder
        if [ -f "$APP_DIR/deploy/ecosystem.config.js" ]; then
            cp "$APP_DIR/deploy/ecosystem.config.js" "$APP_DIR/ecosystem.config.js"
            success "Copied ecosystem config"
        fi
        
        # Kill any existing PM2 processes
        pm2 kill || true
        
        # Start fresh PM2 daemon
        pm2 status || true
        
        # Start application
        cd "$APP_DIR"
        pm2 start ecosystem.config.js --name wms-production
        
        # Save configuration
        pm2 save
        
        # Setup startup script
        sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
        
        # Execute the startup command if provided
        STARTUP_CMD=$(pm2 startup systemd -u $USER --hp /home/$USER | grep sudo | tail -n 1)
        if [ -n "$STARTUP_CMD" ]; then
            eval "$STARTUP_CMD"
        fi
        
        success "PM2 configured and application started"
        
        # Show status
        pm2 status
    else
        warning "Skipping PM2 setup (not in production or PM2 not installed)"
    fi
}

# Configure Nginx
configure_nginx() {
    if [[ "$DEPLOYMENT_TYPE" == "production" ]] && command -v nginx &> /dev/null; then
        info "Configuring Nginx..."
        
        # Create nginx configuration
        sudo tee /etc/nginx/sites-available/wms > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    # WMS application
    location /wms {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Main site root (optional)
    location / {
        root /var/www/html;
        index index.html;
    }
}
EOF
        
        # Enable site
        sudo ln -sf /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
        
        # Test configuration
        if sudo nginx -t; then
            sudo systemctl restart nginx
            success "Nginx configured successfully"
        else
            error_exit "Nginx configuration failed"
        fi
    else
        warning "Skipping Nginx configuration"
    fi
}

# Setup SSL
setup_ssl() {
    if [[ "$DEPLOYMENT_TYPE" == "production" ]] && command -v certbot &> /dev/null; then
        info "Setting up SSL certificate..."
        
        read -p "Setup SSL with Let's Encrypt? (y/n): " setup_ssl
        if [[ $setup_ssl =~ ^[Yy]$ ]]; then
            sudo apt install -y certbot python3-certbot-nginx
            sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME"
            success "SSL certificate configured"
        fi
    else
        warning "Skipping SSL setup"
    fi
}

# Setup firewall
setup_firewall() {
    if [[ "$DEPLOYMENT_TYPE" == "production" ]] && command -v ufw &> /dev/null; then
        info "Configuring firewall..."
        
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Enable firewall if not already enabled
        if ! sudo ufw status | grep -q "Status: active"; then
            echo "y" | sudo ufw enable
        fi
        
        success "Firewall configured"
    else
        warning "Skipping firewall configuration"
    fi
}

# Create management scripts
create_management_scripts() {
    info "Creating management scripts..."
    
    # Update script
    cat > "${APP_DIR}/update-wms.sh" << EOF
#!/bin/bash
cd ${APP_DIR}
git pull origin main
npm install --production=false
npm run build
[[ "$DEPLOYMENT_TYPE" == "production" ]] && pm2 restart wms-production || npm run dev
EOF
    chmod +x "${APP_DIR}/update-wms.sh"
    
    # Logs script
    cat > "${APP_DIR}/wms-logs.sh" << EOF
#!/bin/bash
if command -v pm2 &> /dev/null && [[ "$DEPLOYMENT_TYPE" == "production" ]]; then
    pm2 logs wms-production --lines 100
else
    tail -f ${APP_DIR}/logs/dev.log
fi
EOF
    chmod +x "${APP_DIR}/wms-logs.sh"
    
    # Backup script
    cat > "${APP_DIR}/backup-wms.sh" << EOF
#!/bin/bash
BACKUP_DIR="${APP_DIR}/backups"
mkdir -p "\$BACKUP_DIR"
TIMESTAMP=\$(date +%Y%m%d-%H%M%S)

# Backup database
if [[ -n "${DATABASE_URL}" ]]; then
    pg_dump "${DATABASE_URL}" > "\$BACKUP_DIR/wms-db-\$TIMESTAMP.sql"
    gzip "\$BACKUP_DIR/wms-db-\$TIMESTAMP.sql"
    echo "Database backed up to: \$BACKUP_DIR/wms-db-\$TIMESTAMP.sql.gz"
fi

# Cleanup old backups (keep last 7 days)
find "\$BACKUP_DIR" -name "wms-db-*.sql.gz" -mtime +7 -delete
EOF
    chmod +x "${APP_DIR}/backup-wms.sh"
    
    success "Management scripts created"
}

# Final summary
show_summary() {
    echo ""
    log "${GREEN}=== Deployment Complete ===${NC}"
    echo ""
    info "Deployment Type: ${DEPLOYMENT_TYPE}"
    info "Application Directory: ${APP_DIR}"
    info "Domain: ${DOMAIN_NAME}"
    echo ""
    
    if [[ "$DEPLOYMENT_TYPE" == "production" ]]; then
        success "Next Steps:"
        echo "1. Update DNS records to point to this server"
        echo "2. Configure RDS security group to allow this instance"
        echo "3. Review and save credentials from: ${APP_DIR}/credentials-${DEPLOYMENT_TYPE}.txt"
        echo ""
        success "Management Commands:"
        echo "- View logs: ${APP_DIR}/wms-logs.sh"
        echo "- Update app: ${APP_DIR}/update-wms.sh"
        echo "- Backup database: ${APP_DIR}/backup-wms.sh"
        echo "- PM2 status: pm2 status"
        echo ""
        success "Application URL: https://${DOMAIN_NAME}/wms"
    else
        success "Development server commands:"
        echo "- Start dev server: npm run dev"
        echo "- View logs: ${APP_DIR}/wms-logs.sh"
        echo "- Update app: ${APP_DIR}/update-wms.sh"
        echo ""
        success "Application URL: http://localhost:3000"
    fi
    
    warning "Don't forget to delete the credentials file after saving the passwords!"
}

# Main deployment flow
main() {
    clear
    log "${BLUE}================================${NC}"
    log "${BLUE}   WMS Deployment Script${NC}"
    log "${BLUE}================================${NC}"
    echo ""
    
    # Check system
    check_ubuntu
    
    # Get deployment type
    prompt "Deployment type (development/production)" "production" DEPLOYMENT_TYPE
    DEPLOYMENT_TYPE=$(echo "$DEPLOYMENT_TYPE" | tr '[:upper:]' '[:lower:]')
    
    if [[ "$DEPLOYMENT_TYPE" != "development" && "$DEPLOYMENT_TYPE" != "production" ]]; then
        error_exit "Invalid deployment type. Use 'development' or 'production'"
    fi
    
    info "Starting ${DEPLOYMENT_TYPE} deployment..."
    echo ""
    
    # Run deployment steps
    install_dependencies
    setup_app_directory
    setup_repository
    generate_passwords
    setup_environment
    build_application
    setup_pm2
    configure_nginx
    setup_ssl
    setup_firewall
    create_management_scripts
    
    # Show summary
    show_summary
    
    log "${GREEN}Deployment log saved to: $LOG_FILE${NC}"
}

# Run main function
main "$@"