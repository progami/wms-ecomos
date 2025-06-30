#!/bin/bash

# Setup script for cost calculation cron jobs
# This script sets up the weekly storage calculation cron job

echo "Setting up cost calculation cron jobs..."

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check if running on a Unix-like system
if [[ "$OSTYPE" != "linux-gnu"* && "$OSTYPE" != "darwin"* ]]; then
    echo "This script is designed for Linux/macOS systems."
    echo "For Windows, please use Task Scheduler."
    exit 1
fi

# Create the cron job entry
# Runs every Monday at 2:00 AM local time
CRON_ENTRY="0 2 * * 1 cd $PROJECT_DIR && /usr/bin/npm run calculate:storage:weekly >> $PROJECT_DIR/logs/cron-storage-calculation.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "calculate:storage:weekly"; then
    echo "Cost calculation cron job already exists."
    echo "Current cron entry:"
    crontab -l | grep "calculate:storage:weekly"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "Cost calculation cron job added successfully."
    echo "Cron entry: $CRON_ENTRY"
fi

# Create log directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

echo ""
echo "Cron job setup complete!"
echo ""
echo "The weekly storage calculation will run:"
echo "- Every Monday at 2:00 AM"
echo "- Logs will be saved to: $PROJECT_DIR/logs/cron-storage-calculation.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To edit cron jobs: crontab -e"
echo "To remove the cron job: crontab -l | grep -v 'calculate:storage:weekly' | crontab -"
echo ""
echo "To test the script manually: npm run calculate:storage:weekly"