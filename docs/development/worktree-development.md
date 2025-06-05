# Worktree-Based Multi-Agent Development

## Why Worktrees?

When multiple agents work in the same folder, `git checkout` commands conflict:
- Agent 1 checks out `ops/current-work`
- Agent 2 checks out `fin/current-work` → This overwrites Agent 1's work!

**Git worktrees solve this** by creating separate working directories that share the same repository.

## Setup

Run the setup script:
```bash
cd /Users/jarraramjad/Documents/warehouse_management
./scripts/setup-worktrees.sh
```

This creates:
```
/Users/jarraramjad/Documents/
├── warehouse_management/          # Main branch (PR Master)
├── warehouse_management_ops/      # Operations Agent
├── warehouse_management_fin/      # Finance Agent
├── warehouse_management_cfg/      # Configuration Agent
└── warehouse_management_ana/      # Analytics Agent
```

## Agent Instructions

### PR Master (You)
```bash
cd /Users/jarraramjad/Documents/warehouse_management
git checkout main
npm run dev  # Port 3000
```

### Operations Agent
```bash
cd /Users/jarraramjad/Documents/warehouse_management_ops
# Already on ops/feature branch
git pull origin main  # Get latest changes
# Work on operations files only
npm run dev  # Runs on port 3001 (from .env.local)
```

### Finance Agent
```bash
cd /Users/jarraramjad/Documents/warehouse_management_fin
# Already on fin/feature branch
git pull origin main
# Work on finance files only
npm run dev  # Runs on port 3002 (from .env.local)
```

### Configuration Agent
```bash
cd /Users/jarraramjad/Documents/warehouse_management_cfg
# Already on cfg/feature branch
git pull origin main
# Work on configuration files only
npm run dev  # Runs on port 3003 (from .env.local)
```

### Analytics Agent
```bash
cd /Users/jarraramjad/Documents/warehouse_management_ana
# Already on ana/feature branch
git pull origin main
# Work on analytics files only
npm run dev  # Runs on port 3004 (from .env.local)
```

## Module Boundaries

Each agent owns specific directories:

| Agent | Owns |
|-------|------|
| Operations | `/src/app/operations/`, `/src/app/api/inventory/`, `/src/app/api/skus/` |
| Finance | `/src/app/finance/`, `/src/app/api/invoices/`, `/src/app/api/reconciliation/` |
| Configuration | `/src/app/config/`, `/src/app/admin/settings/`, `/src/app/api/rates/` |
| Analytics | `/src/app/reports/`, `/src/app/integrations/`, `/src/app/api/amazon/` |

## How It Works

1. **Each agent has their own folder** - No conflicts!
2. **All share the same Git repository** - Changes are synchronized through Git
3. **Branches are pre-checked out** - No need to switch branches
4. **Independent npm installs** - Each worktree has its own node_modules

## Workflow

1. **Agent makes changes**:
   ```bash
   # In their worktree directory
   git add .
   git commit -m "feat(module): description"
   git push origin [their-branch]
   ```

2. **PR Master merges**:
   ```bash
   # In main warehouse_management directory
   git checkout main
   git pull origin main
   git merge origin/ops/feature
   git push origin main
   ```

3. **Agents sync**:
   ```bash
   # In their worktree directory
   git pull origin main
   ```

## Managing Worktrees

```bash
# List all worktrees
git worktree list

# Remove a worktree
git worktree remove /path/to/worktree

# Add a new worktree
git worktree add ../new_worktree branch-name
```

## Important Notes

- Each worktree needs its own `npm install`
- Don't share node_modules between worktrees
- Always commit and push before switching contexts
- Use different ports for dev servers if running multiple

## Benefits

✅ True parallel development - no conflicts  
✅ Each agent has isolated workspace  
✅ All changes tracked in same repository  
✅ Easy to merge and coordinate  
✅ Can run multiple dev servers simultaneously