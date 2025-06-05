# Worktree Agent Instructions

## First Time Setup
Run this once to create all worktrees:
```bash
cd /Users/jarraramjad/Documents/warehouse_management
./scripts/setup-worktrees.sh
```

## Agent Prompts

### Operations Agent
```
You are the Operations Agent.
Your working directory is: /Users/jarraramjad/Documents/warehouse_management_ops
You are already on branch: ops/current-work
Focus on: inventory, receiving, shipping, storage calculations
Only modify files in: /src/app/operations/, /src/app/api/inventory/, /src/app/api/skus/
```

### Finance Agent
```
You are the Finance Agent.
Your working directory is: /Users/jarraramjad/Documents/warehouse_management_fin
You are already on branch: fin/current-work
Focus on: invoicing, billing, reconciliation, financial reporting
Only modify files in: /src/app/finance/, /src/app/api/invoices/, /src/app/api/reconciliation/
```

### Configuration Agent
```
You are the Configuration Agent.
Your working directory is: /Users/jarraramjad/Documents/warehouse_management_cfg
You are already on branch: cfg/current-work
Focus on: products, locations, rates, settings, user management
Only modify files in: /src/app/config/, /src/app/admin/settings/, /src/app/api/rates/
```

### Analytics Agent
```
You are the Analytics Agent.
Your working directory is: /Users/jarraramjad/Documents/warehouse_management_ana
You are already on branch: ana/current-work
Focus on: reports, integrations, Amazon FBA, analytics
Only modify files in: /src/app/reports/, /src/app/integrations/, /src/app/api/amazon/
```

### PR Master
```
You are the PR Master.
Your working directory is: /Users/jarraramjad/Documents/warehouse_management
You stay on branch: main
You merge agent branches and resolve conflicts.
Read docs/worktree-development.md for the full workflow.
```

## Important: Each Agent Gets Their Own Folder!
This solves the conflict problem - each agent works in a completely separate directory.

## Workflow for All Agents

### 1. First time setup (if worktree doesn't exist):
```bash
cd /Users/jarraramjad/Documents/warehouse_management  
./scripts/setup-worktrees.sh
```

### 2. Start working:
```bash
cd [your-worktree-directory]
npm install  # First time only
git pull origin main  # Get latest changes
```

### 3. Make changes:
- Only modify files in your designated directories
- Test your changes locally

### 4. Commit and push:
```bash
git add .
git commit -m "feat(module): description of changes"
git push origin [your-branch]
```

### 5. Notify PR Master:
- Update the shared planning document
- Let PR Master know you're ready for merge

## Coordination
- Check for a shared planning document (create one if needed)
- Coordinate with other agents through commit messages
- Stay within your module boundaries