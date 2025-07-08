#!/bin/bash

# Deploy WMS with SSL using Ansible
# This script runs the Ansible playbook to configure SSL certificates and path-based routing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."
ANSIBLE_DIR="$PROJECT_ROOT/infrastructure/ansible"

echo -e "${GREEN}Starting WMS deployment with SSL and path-based routing...${NC}"

# Check if ansible is installed
if ! command -v ansible &> /dev/null; then
    echo -e "${RED}Error: Ansible is not installed${NC}"
    echo "Please install Ansible: pip install ansible"
    exit 1
fi

# Check if ansible directory exists
if [ ! -d "$ANSIBLE_DIR" ]; then
    echo -e "${RED}Error: Ansible directory not found at $ANSIBLE_DIR${NC}"
    exit 1
fi

# Change to ansible directory
cd "$ANSIBLE_DIR"

# Check if inventory file exists
if [ ! -f "inventory/production.yml" ]; then
    echo -e "${RED}Error: Inventory file not found${NC}"
    exit 1
fi

# Ensure SSH key permissions
if [ -f "$HOME/.ssh/my-key-pair.pem" ]; then
    chmod 600 "$HOME/.ssh/my-key-pair.pem"
    echo -e "${GREEN}SSH key permissions set${NC}"
fi

# Run ansible playbook
echo -e "${YELLOW}Running Ansible playbook...${NC}"
echo -e "${YELLOW}This will:${NC}"
echo -e "${YELLOW}  1. Install SSL certificates for targonglobal.com${NC}"
echo -e "${YELLOW}  2. Configure Nginx with path-based routing (/WMS)${NC}"
echo -e "${YELLOW}  3. Deploy the application with BASE_PATH=/WMS${NC}"
echo -e "${YELLOW}  4. Set up automatic SSL renewal${NC}"

# Add SSH key to ansible command if it exists
SSH_KEY_ARG=""
if [ -f "$HOME/.ssh/my-key-pair.pem" ]; then
    SSH_KEY_ARG="--private-key=$HOME/.ssh/my-key-pair.pem"
fi

# Run the playbook
ansible-playbook -i inventory/production.yml deploy-wms-ssl.yml $SSH_KEY_ARG -v

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}The WMS application should now be accessible at:${NC}"
    echo -e "${GREEN}  https://targonglobal.com/WMS${NC}"
    echo -e "${YELLOW}Note: targonglobal.com root path will return 404 as requested${NC}"
else
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi