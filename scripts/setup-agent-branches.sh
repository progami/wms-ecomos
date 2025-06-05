#!/bin/bash

# Setup Agent Branches for Multi-Agent Workflow
echo "🚀 Setting up agent branches for multi-agent workflow..."
echo "=================================================="

# Ensure we're on main and up to date
echo "📥 Updating main branch..."
git checkout main
git pull origin main

# Create Operations Agent branch
echo ""
echo "🔧 Creating Operations Agent branch..."
git checkout -b ops/current-work 2>/dev/null || git checkout ops/current-work
git push -u origin ops/current-work 2>/dev/null || echo "  ℹ️  Branch already exists on remote"

# Create Finance Agent branch
echo ""
echo "💰 Creating Finance Agent branch..."
git checkout main
git checkout -b fin/current-work 2>/dev/null || git checkout fin/current-work
git push -u origin fin/current-work 2>/dev/null || echo "  ℹ️  Branch already exists on remote"

# Create Configuration Agent branch
echo ""
echo "⚙️  Creating Configuration Agent branch..."
git checkout main
git checkout -b cfg/current-work 2>/dev/null || git checkout cfg/current-work
git push -u origin cfg/current-work 2>/dev/null || echo "  ℹ️  Branch already exists on remote"

# Create Analytics Agent branch
echo ""
echo "📊 Creating Analytics Agent branch..."
git checkout main
git checkout -b ana/current-work 2>/dev/null || git checkout ana/current-work
git push -u origin ana/current-work 2>/dev/null || echo "  ℹ️  Branch already exists on remote"

# Return to main
echo ""
echo "🏠 Returning to main branch..."
git checkout main

# Create merge status file
echo ""
echo "📄 Creating MERGE_STATUS.md..."
cat > MERGE_STATUS.md << 'EOF'
# Merge Status

## Pending Merges
- [ ] ops/current-work
- [ ] fin/current-work
- [ ] cfg/current-work
- [ ] ana/current-work

## Completed Merges
<!-- Merges will be listed here -->

---
*Last updated: $(date)*
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start your agents in separate terminals"
echo "2. Tell each agent their branch:"
echo "   - Operations: 'You work on ops/current-work branch'"
echo "   - Finance: 'You work on fin/current-work branch'"
echo "   - Configuration: 'You work on cfg/current-work branch'"
echo "   - Analytics: 'You work on ana/current-work branch'"
echo "3. When ready to merge, tell the PR Master (Claude on main branch)"
echo ""
echo "📖 Full documentation: docs/pr-master-workflow.md"