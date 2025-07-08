#!/bin/bash

set -e

echo "WMS Application Deployment Script"
echo "================================="

APP_DIR="/home/wms/wms-app"
SERVICE_NAME="wms-app"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        echo "Please run as root (use sudo)"
        exit 1
    fi
}

# Function to test the application directly
test_direct_start() {
    echo -e "\n1. Testing direct Node.js start..."
    
    cd "$APP_DIR"
    
    # Check if standalone exists
    if [ ! -f ".next/standalone/server.js" ]; then
        echo "Error: .next/standalone/server.js not found!"
        echo "The application may not have been built with standalone output."
        echo "Please rebuild with: npm run build"
        return 1
    fi
    
    # Copy public and static folders if they exist
    if [ -d "public" ] && [ ! -d ".next/standalone/public" ]; then
        echo "Copying public directory to standalone..."
        cp -r public .next/standalone/
    fi
    
    if [ -d ".next/static" ] && [ ! -d ".next/standalone/.next/static" ]; then
        echo "Copying static directory to standalone..."
        mkdir -p .next/standalone/.next/
        cp -r .next/static .next/standalone/.next/
    fi
    
    echo "Starting server with environment variables..."
    echo "BASE_PATH=/WMS"
    echo "PORT=3000"
    echo "NODE_ENV=production"
    
    # Run for 10 seconds to test
    timeout 10s env BASE_PATH=/WMS PORT=3000 NODE_ENV=production HOSTNAME=0.0.0.0 \
        node .next/standalone/server.js || true
    
    echo -e "\nDirect start test completed."
}

# Function to setup systemd service
setup_systemd() {
    echo -e "\n2. Setting up systemd service..."
    
    # Copy service file
    cp /home/wms/wms-app/wms-app.service /etc/systemd/system/
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable the service
    systemctl enable $SERVICE_NAME
    
    echo "Systemd service configured."
}

# Function to start the service
start_service() {
    echo -e "\n3. Starting WMS application service..."
    
    # Stop PM2 process if running
    su - wms -c "pm2 delete wms-app" 2>/dev/null || true
    
    # Start systemd service
    systemctl start $SERVICE_NAME
    
    # Check status
    sleep 2
    systemctl status $SERVICE_NAME --no-pager
}

# Function to test the application
test_application() {
    echo -e "\n4. Testing application endpoints..."
    
    sleep 3  # Give the app time to start
    
    echo "Testing http://localhost:3000/ (should redirect or show app):"
    curl -I http://localhost:3000/ 2>/dev/null | head -5
    
    echo -e "\nTesting http://localhost:3000/WMS (main app endpoint):"
    curl -I http://localhost:3000/WMS 2>/dev/null | head -5
    
    echo -e "\nTesting through nginx (external access):"
    curl -I http://localhost/WMS 2>/dev/null | head -5
}

# Function to show logs
show_logs() {
    echo -e "\n5. Recent application logs:"
    journalctl -u $SERVICE_NAME -n 50 --no-pager
}

# Main execution
main() {
    check_root
    
    echo "Choose deployment option:"
    echo "1. Test direct start only"
    echo "2. Setup and start systemd service"
    echo "3. Full deployment (test + systemd + verification)"
    echo "4. Show service logs"
    echo "5. Stop service"
    echo "6. Restart service"
    
    read -p "Enter option (1-6): " option
    
    case $option in
        1)
            test_direct_start
            ;;
        2)
            setup_systemd
            start_service
            ;;
        3)
            test_direct_start
            setup_systemd
            start_service
            test_application
            show_logs
            ;;
        4)
            show_logs
            ;;
        5)
            systemctl stop $SERVICE_NAME
            echo "Service stopped."
            ;;
        6)
            systemctl restart $SERVICE_NAME
            sleep 2
            systemctl status $SERVICE_NAME --no-pager
            ;;
        *)
            echo "Invalid option"
            exit 1
            ;;
    esac
}

# Run main function
main