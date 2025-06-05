#!/bin/bash

# Reset Agent Branches Script
# This script resets all agent branches to main and creates fresh working branches

echo "🔄 Resetting all agent branches to latest main..."
echo "================================================"
echo ""

# Ensure we're on main and up to date
echo "📥 Updating main branch..."
git checkout main
git pull origin main

# Get latest commit hash
LATEST_COMMIT=$(git rev-parse HEAD)
echo "✓ Main branch at commit: $LATEST_COMMIT"
echo ""

# Function to reset a worktree
reset_worktree() {
    local WORKTREE_PATH=$1
    local BRANCH_NAME=$2
    local AGENT_NAME=$3
    
    echo "🔧 Resetting $AGENT_NAME worktree..."
    
    # Navigate to main repo to perform git operations
    cd /Users/jarraramjad/Documents/warehouse_management
    
    # Delete the old branch if it exists (both locally and remotely)
    git branch -D $BRANCH_NAME 2>/dev/null || true
    git push origin --delete $BRANCH_NAME 2>/dev/null || true
    
    # Create fresh branch from main
    git branch $BRANCH_NAME main
    
    # Update the worktree to use the new branch
    cd $WORKTREE_PATH
    git checkout -B $BRANCH_NAME origin/main
    git pull origin main --rebase
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "   📦 Installing dependencies for $AGENT_NAME..."
        npm install
    fi
    
    # Copy latest env files
    cp /Users/jarraramjad/Documents/warehouse_management/.env* . 2>/dev/null || true
    
    echo "   ✓ $AGENT_NAME worktree reset to latest main on branch $BRANCH_NAME"
    echo ""
}

# Reset each agent's worktree
reset_worktree "/Users/jarraramjad/Documents/warehouse_management_ops" "ops/feature" "Operations"
reset_worktree "/Users/jarraramjad/Documents/warehouse_management_fin" "fin/feature" "Finance"
reset_worktree "/Users/jarraramjad/Documents/warehouse_management_cfg" "cfg/feature" "Configuration"
reset_worktree "/Users/jarraramjad/Documents/warehouse_management_ana" "ana/feature" "Analytics"

# Return to main directory
cd /Users/jarraramjad/Documents/warehouse_management

echo "✅ All agent branches have been reset!"
echo ""
echo "📋 New branch structure:"
echo "   • Operations:    ops/feature (in warehouse_management_ops)"
echo "   • Finance:       fin/feature (in warehouse_management_fin)"
echo "   • Configuration: cfg/feature (in warehouse_management_cfg)"
echo "   • Analytics:     ana/feature (in warehouse_management_ana)"
echo ""
echo "Each agent should now:"
echo "1. cd to their worktree directory"
echo "2. Start working on their assigned features"
echo "3. Commit and push to their feature branch"
echo "4. Notify PR Master when ready for merge"