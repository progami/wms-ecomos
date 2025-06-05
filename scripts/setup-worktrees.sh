#!/bin/bash

# Setup Git Worktrees for Multi-Agent Development
echo "🚀 Setting up Git Worktrees for Multi-Agent Development"
echo "======================================================"
echo ""

# Get the parent directory
PARENT_DIR=$(dirname $(pwd))
REPO_NAME=$(basename $(pwd))

echo "📁 Current repository: $(pwd)"
echo "📁 Worktrees will be created in: $PARENT_DIR"
echo ""

# Ensure we're on main and up to date
echo "📥 Updating main branch..."
git checkout main
git pull origin main

# Create worktrees for each agent
echo ""
echo "🔧 Creating Operations worktree..."
git worktree add "$PARENT_DIR/${REPO_NAME}_ops" -b ops/current-work || git worktree add "$PARENT_DIR/${REPO_NAME}_ops" ops/current-work

echo "💰 Creating Finance worktree..."
git worktree add "$PARENT_DIR/${REPO_NAME}_fin" -b fin/current-work || git worktree add "$PARENT_DIR/${REPO_NAME}_fin" fin/current-work

echo "⚙️  Creating Configuration worktree..."
git worktree add "$PARENT_DIR/${REPO_NAME}_cfg" -b cfg/current-work || git worktree add "$PARENT_DIR/${REPO_NAME}_cfg" cfg/current-work

echo "📊 Creating Analytics worktree..."
git worktree add "$PARENT_DIR/${REPO_NAME}_ana" -b ana/current-work || git worktree add "$PARENT_DIR/${REPO_NAME}_ana" ana/current-work

echo ""
echo "✅ Worktrees created successfully!"
echo ""
echo "📂 Directory structure:"
echo "   $PARENT_DIR/"
echo "   ├── $REPO_NAME/          (main branch - PR Master)"
echo "   ├── ${REPO_NAME}_ops/    (ops/current-work - Operations Agent)"
echo "   ├── ${REPO_NAME}_fin/    (fin/current-work - Finance Agent)"
echo "   ├── ${REPO_NAME}_cfg/    (cfg/current-work - Configuration Agent)"
echo "   └── ${REPO_NAME}_ana/    (ana/current-work - Analytics Agent)"
echo ""
echo "📋 Next steps:"
echo "1. Each agent should cd to their worktree directory"
echo "2. Each agent can now work independently without conflicts"
echo "3. All worktrees share the same .git repository"
echo ""
echo "🔍 To see all worktrees: git worktree list"
echo "🗑️  To remove a worktree: git worktree remove <path>"