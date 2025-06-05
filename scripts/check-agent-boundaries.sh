#!/bin/bash

# Script to check if an agent modified files outside their boundaries

AGENT=$1
BRANCH=$2

if [ -z "$AGENT" ] || [ -z "$BRANCH" ]; then
    echo "Usage: ./scripts/check-agent-boundaries.sh <agent> <branch>"
    echo "Example: ./scripts/check-agent-boundaries.sh operations ops/current-work"
    exit 1
fi

echo "🔍 Checking boundaries for $AGENT agent on $BRANCH branch..."
echo ""

# Define allowed paths for each agent
case $AGENT in
    "operations")
        ALLOWED_PATHS="src/app/operations/ src/app/api/inventory/ src/app/api/skus/ src/app/api/transactions/ src/app/api/warehouse-configs/ src/components/operations/ src/lib/calculations/inventory-balance.ts src/lib/calculations/storage-ledger.ts"
        ;;
    "finance")
        ALLOWED_PATHS="src/app/finance/ src/app/api/finance/ src/app/api/invoices/ src/app/api/reconciliation/ src/app/api/storage-ledger/"
        ;;
    "configuration")
        ALLOWED_PATHS="src/app/config/ src/app/admin/settings/ src/app/admin/users/ src/app/api/settings/ src/app/api/rates/ src/app/api/auth/"
        ;;
    "analytics")
        ALLOWED_PATHS="src/app/reports/ src/app/analytics/ src/app/integrations/ src/app/api/reports/ src/app/api/export/ src/app/api/amazon/ src/app/api/dashboard/ src/lib/amazon/"
        ;;
    *)
        echo "❌ Unknown agent: $AGENT"
        exit 1
        ;;
esac

# Get modified files
MODIFIED_FILES=$(git diff main...$BRANCH --name-only)

if [ -z "$MODIFIED_FILES" ]; then
    echo "✅ No files modified on $BRANCH"
    exit 0
fi

echo "Files modified on $BRANCH:"
echo "$MODIFIED_FILES"
echo ""

# Check each file
VIOLATIONS=0
for file in $MODIFIED_FILES; do
    ALLOWED=0
    for path in $ALLOWED_PATHS; do
        if [[ $file == $path* ]]; then
            ALLOWED=1
            break
        fi
    done
    
    # Also allow AGENT_PLAN.md for all agents
    if [[ $file == "AGENT_PLAN.md" ]]; then
        ALLOWED=1
    fi
    
    if [ $ALLOWED -eq 0 ]; then
        echo "❌ VIOLATION: $file is outside $AGENT agent's boundaries!"
        VIOLATIONS=$((VIOLATIONS + 1))
    else
        echo "✅ OK: $file"
    fi
done

echo ""
if [ $VIOLATIONS -eq 0 ]; then
    echo "✅ All files are within boundaries!"
else
    echo "❌ Found $VIOLATIONS boundary violations!"
    echo ""
    echo "The $AGENT agent should only modify:"
    for path in $ALLOWED_PATHS; do
        echo "  - $path"
    done
    exit 1
fi