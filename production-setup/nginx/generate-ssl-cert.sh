#!/bin/bash

# Generate self-signed SSL certificate for local development
# This creates a certificate valid for 365 days

DOMAIN="targongglobal.com"
SSL_DIR="/usr/local/etc/nginx/ssl"

echo "Generating self-signed SSL certificate for $DOMAIN"
echo "This certificate is for LOCAL DEVELOPMENT ONLY"
echo ""

# Create SSL directory if it doesn't exist
sudo mkdir -p $SSL_DIR

# Generate private key and certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $SSL_DIR/$DOMAIN.key \
    -out $SSL_DIR/$DOMAIN.crt \
    -subj "/C=US/ST=State/L=City/O=Local Development/CN=$DOMAIN" \
    -addext "subjectAltName = DNS:$DOMAIN, DNS:www.$DOMAIN, DNS:localhost"

# Set appropriate permissions
sudo chmod 600 $SSL_DIR/$DOMAIN.key
sudo chmod 644 $SSL_DIR/$DOMAIN.crt

echo ""
echo "SSL certificate generated successfully!"
echo "Certificate: $SSL_DIR/$DOMAIN.crt"
echo "Private Key: $SSL_DIR/$DOMAIN.key"
echo ""
echo "Note: Your browser will show a security warning because this is a self-signed certificate."
echo "You can add an exception in your browser to proceed."