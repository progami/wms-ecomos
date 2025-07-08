#!/bin/bash

echo "Checking WMS application structure..."
echo "=================================="

APP_DIR="/home/wms/wms-app"

echo -e "\n1. Checking if .next/standalone exists:"
if [ -d "$APP_DIR/.next/standalone" ]; then
    echo "✓ .next/standalone directory exists"
    
    echo -e "\n2. Listing standalone directory contents:"
    ls -la "$APP_DIR/.next/standalone/"
    
    echo -e "\n3. Checking for server.js:"
    if [ -f "$APP_DIR/.next/standalone/server.js" ]; then
        echo "✓ server.js exists"
        echo "File permissions:"
        ls -la "$APP_DIR/.next/standalone/server.js"
    else
        echo "✗ server.js NOT FOUND"
    fi
    
    echo -e "\n4. Checking for public and static directories:"
    ls -la "$APP_DIR/.next/standalone/.next/" 2>/dev/null || echo "No .next directory in standalone"
    
    echo -e "\n5. Checking package.json in standalone:"
    if [ -f "$APP_DIR/.next/standalone/package.json" ]; then
        echo "✓ package.json exists"
        cat "$APP_DIR/.next/standalone/package.json"
    else
        echo "✗ package.json NOT FOUND"
    fi
else
    echo "✗ .next/standalone directory NOT FOUND"
    
    echo -e "\n Checking .next directory:"
    if [ -d "$APP_DIR/.next" ]; then
        echo "✓ .next directory exists"
        ls -la "$APP_DIR/.next/"
    else
        echo "✗ .next directory NOT FOUND"
    fi
fi

echo -e "\n6. Checking main package.json:"
if [ -f "$APP_DIR/package.json" ]; then
    echo "✓ Main package.json exists"
    grep -E '"scripts"|"start"|"build"' "$APP_DIR/package.json" -A 5
fi

echo -e "\n7. Checking next.config.js:"
if [ -f "$APP_DIR/next.config.js" ]; then
    echo "✓ next.config.js exists"
    grep -E 'output|basePath|standalone' "$APP_DIR/next.config.js" -A 2 -B 2
fi