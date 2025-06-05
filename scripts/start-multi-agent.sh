#!/bin/bash

# Multi-Agent Workflow Starter for Warehouse Management System
# This script helps you quickly set up the 4-agent workflow

echo "🚀 Warehouse Management Multi-Agent Workflow Starter"
echo "=================================================="
echo ""
echo "This will guide you through starting 4 specialized agents:"
echo "  1. Operations - Inventory, Receiving, Shipping"
echo "  2. Finance - Invoicing, Billing, Reconciliation"  
echo "  3. Configuration - Products, Locations, Rates, Settings"
echo "  4. Analytics - Reports & Integrations (including Amazon FBA)"
echo ""
echo "📋 Instructions:"
echo "1. Open VSCode with 4 terminal tabs"
echo "2. Run the following commands in each terminal:"
echo ""
echo "Terminal 1 - Operations:"
echo "  cd $(pwd) && claude"
echo "  > You are Agent 1 - The Operations Agent. Create WAREHOUSE_AGENT_PLAN.md and begin working on operations module tasks."
echo ""
echo "Terminal 2 - Finance:"
echo "  cd $(pwd) && claude"
echo "  > You are Agent 2 - The Finance Agent. Read WAREHOUSE_AGENT_PLAN.md and start working on finance module tasks."
echo ""
echo "Terminal 3 - Configuration:"
echo "  cd $(pwd) && claude"
echo "  > You are Agent 3 - The Configuration Agent. Read WAREHOUSE_AGENT_PLAN.md and work on configuration module tasks."
echo ""
echo "Terminal 4 - Analytics:"
echo "  cd $(pwd) && claude"
echo "  > You are Agent 4 - The Analytics Agent. Read WAREHOUSE_AGENT_PLAN.md and work on reports and integrations."
echo ""
echo "📄 The agents will coordinate through: WAREHOUSE_AGENT_PLAN.md"
echo "📚 Full documentation: docs/multi-agent-workflow.md"
echo ""
echo "Press Enter to create a template WAREHOUSE_AGENT_PLAN.md (or Ctrl+C to skip)..."
read

# Create template planning document if it doesn't exist
if [ ! -f "WAREHOUSE_AGENT_PLAN.md" ]; then
cat > WAREHOUSE_AGENT_PLAN.md << 'EOF'
# Warehouse Management System - Agent Coordination

## Current Sprint: Initial Setup
**Goal**: Set up multi-agent workflow and identify immediate tasks
**Timeline**: $(date +%Y-%m-%d) - TBD

## Active Tasks

### Task: Review Current System State
- **Assigned To**: All Agents
- **Status**: Pending
- **Dependencies**: None
- **Notes**: Each agent should review their module area
- **Last Updated**: $(date +"%Y-%m-%d %H:%M") - Created

### Task: Review Operations Module
- **Assigned To**: Operations Agent
- **Status**: Pending
- **Dependencies**: System review
- **Notes**: Check inventory accuracy, receiving/shipping workflows
- **Last Updated**: $(date +"%Y-%m-%d %H:%M") - Created

### Task: Review Finance Module
- **Assigned To**: Finance Agent
- **Status**: Pending
- **Dependencies**: None
- **Notes**: Check invoices, reconciliations, and billing calculations
- **Last Updated**: $(date +"%Y-%m-%d %H:%M") - Created

### Task: Review Configuration Module
- **Assigned To**: Configuration Agent
- **Status**: Pending
- **Dependencies**: None
- **Notes**: Verify products, locations, rates, and warehouse settings
- **Last Updated**: $(date +"%Y-%m-%d %H:%M") - Created

### Task: Review Analytics Module
- **Assigned To**: Analytics Agent
- **Status**: Pending
- **Dependencies**: None
- **Notes**: Check reports, Amazon FBA integration, and analytics
- **Last Updated**: $(date +"%Y-%m-%d %H:%M") - Created

## Inter-Agent Messages

[Agents will add messages here as needed]

## Completed Tasks

[Completed tasks will be moved here]

---
*Last synchronized: $(date +"%Y-%m-%d %H:%M:%S")*
EOF
echo "✅ Created WAREHOUSE_AGENT_PLAN.md"
else
echo "ℹ️  WAREHOUSE_AGENT_PLAN.md already exists"
fi

echo ""
echo "🎯 Ready to start! Open VSCode and create 4 terminals to begin."