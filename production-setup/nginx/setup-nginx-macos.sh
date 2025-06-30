#!/bin/bash

# Nginx setup script for macOS with Homebrew

echo "Setting up Nginx for WMS on macOS"
echo "================================"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew is not installed. Please install it first:"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Check if Nginx is installed
if ! brew list nginx &> /dev/null; then
    echo "Installing Nginx..."
    brew install nginx
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p /usr/local/etc/nginx/servers
mkdir -p /usr/local/var/www/targongglobal

# Create a simple index.html for the main domain
cat > /usr/local/var/www/targongglobal/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Targong Global</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #333; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Welcome to Targong Global</h1>
    <p><a href="/wms">Access Warehouse Management System</a></p>
</body>
</html>
EOF

# Copy nginx configuration
echo "Copying Nginx configuration..."
cp wms-local.conf /usr/local/etc/nginx/servers/

# Update main nginx.conf to include servers directory
if ! grep -q "include servers/\*" /usr/local/etc/nginx/nginx.conf; then
    echo "Updating nginx.conf to include servers directory..."
    sed -i '' '/http {/a\
    include servers/*;
' /usr/local/etc/nginx/nginx.conf
fi

# Generate SSL certificate
echo ""
echo "Generating SSL certificate..."
./generate-ssl-cert.sh

# Test nginx configuration
echo ""
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "Nginx configuration is valid!"
    echo ""
    echo "Starting Nginx..."
    brew services start nginx
    
    echo ""
    echo "Nginx setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Add to /etc/hosts:"
    echo "   127.0.0.1 targongglobal.com www.targongglobal.com"
    echo ""
    echo "2. Access your site at:"
    echo "   https://targongglobal.com/wms"
    echo ""
    echo "Useful commands:"
    echo "- Restart Nginx: brew services restart nginx"
    echo "- Stop Nginx: brew services stop nginx"
    echo "- Check logs: tail -f /usr/local/var/log/nginx/*.log"
else
    echo "Nginx configuration test failed. Please check the configuration."
    exit 1
fi