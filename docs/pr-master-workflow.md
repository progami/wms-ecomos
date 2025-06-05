# PR Master Workflow for Multi-Agent Development

## Overview
The PR Master (Claude in main branch) coordinates pull requests from all agent branches, resolving conflicts and ensuring clean merges.

## Branch Structure

```
main (PR Master - coordinates merges)
├── ops/feature-name (Operations Agent)
├── fin/feature-name (Finance Agent)  
├── cfg/feature-name (Configuration Agent)
└── ana/feature-name (Analytics Agent)
```

## Setup Instructions

### 1. Create Agent Branches
```bash
# Create base branches for each agent
git checkout main
git pull origin main

# Operations Agent branch
git checkout -b ops/current-work
git push -u origin ops/current-work

# Finance Agent branch  
git checkout main
git checkout -b fin/current-work
git push -u origin fin/current-work

# Configuration Agent branch
git checkout main
git checkout -b cfg/current-work
git push -u origin cfg/current-work

# Analytics Agent branch
git checkout main
git checkout -b ana/current-work
git push -u origin ana/current-work
```

### 2. Agent Instructions

Each agent should be told:

**Operations Agent:**
```
You are Agent 1 - The Operations Agent. You work on the ops/current-work branch.
Before starting: git checkout ops/current-work && git pull origin main
Your work focuses on the Operations module only.
When done with a feature, commit and push to your branch.
```

**Finance Agent:**
```
You are Agent 2 - The Finance Agent. You work on the fin/current-work branch.
Before starting: git checkout fin/current-work && git pull origin main
Your work focuses on the Finance module only.
When done with a feature, commit and push to your branch.
```

**Configuration Agent:**
```
You are Agent 3 - The Configuration Agent. You work on the cfg/current-work branch.
Before starting: git checkout cfg/current-work && git pull origin main
Your work focuses on the Configuration module only.
When done with a feature, commit and push to your branch.
```

**Analytics Agent:**
```
You are Agent 4 - The Analytics Agent. You work on the ana/current-work branch.
Before starting: git checkout ana/current-work && git pull origin main
Your work focuses on the Analytics module only.
When done with a feature, commit and push to your branch.
```

### 3. PR Master Instructions

When acting as PR Master on the main branch:

```
You are the PR Master coordinating merges from agent branches.
Your responsibilities:
1. Review agent PRs for conflicts
2. Merge branches in order of dependencies
3. Resolve any conflicts based on agent boundaries
4. Ensure all tests pass after merges
5. Keep WAREHOUSE_AGENT_PLAN.md updated with merge status
```

## Merge Protocol

### 1. Agent Completes Work
When an agent completes their task:
```bash
# Agent commits and pushes
git add .
git commit -m "feat(module): description"
git push origin [agent-branch]
```

### 2. Agent Notifies PR Master
Agent updates WAREHOUSE_AGENT_PLAN.md:
```markdown
## Ready for Merge
- Branch: ops/current-work
- Agent: Operations
- Changes: Updated inventory calculations
- Testing: All tests passing
- Conflicts expected: None
```

### 3. PR Master Merges

**No Conflicts Expected:**
```bash
git checkout main
git pull origin main
git merge origin/ops/current-work
git push origin main
```

**Potential Conflicts:**
```bash
git checkout main
git pull origin main
git checkout -b merge/ops-current-work
git merge origin/ops/current-work
# Resolve conflicts based on agent boundaries
git add .
git commit -m "merge: resolve conflicts from ops/current-work"
git checkout main
git merge merge/ops-current-work
git push origin main
```

### 4. Update Other Agents
```bash
# Notify other agents to rebase
git checkout ops/current-work
git pull origin main
git push origin ops/current-work
```

## Conflict Resolution Rules

### Priority by File Type
1. **Module-specific files**: Module owner wins
2. **Shared calculations**: Operations > Finance
3. **Database schema**: Coordinate change, usually Operations leads
4. **Configuration**: Configuration Agent decides
5. **Reports/Analytics**: Analytics Agent decides

### Common Conflict Scenarios

**Scenario 1: Import conflicts**
- Keep both imports, organize alphabetically

**Scenario 2: Database schema**
- Ensure both changes are compatible
- Add migrations in sequence

**Scenario 3: Shared constants**
- Merge both, avoid duplicates
- Maintain alphabetical order

## Best Practices

### For Agents
1. Pull from main before starting work
2. Keep changes within your module boundaries  
3. Run tests before marking ready for merge
4. Update WAREHOUSE_AGENT_PLAN.md when ready

### For PR Master
1. Merge one branch at a time
2. Run full test suite after each merge
3. Document any conflict resolutions
4. Keep agents informed of merge status

## Quick Commands Reference

```bash
# Check all agent branches
git branch -r | grep -E "(ops|fin|cfg|ana)/"

# See pending changes from agent
git diff main..origin/ops/current-work

# Check for conflicts before merge
git merge origin/ops/current-work --no-commit --no-ff
git merge --abort  # if conflicts found

# Update merge status
echo "✓ Merged ops/current-work at $(date)" >> MERGE_LOG.md
```

## Merge Order Guidelines

Typical merge order (adjust based on dependencies):
1. Configuration (cfg) - Base settings
2. Operations (ops) - Core functionality  
3. Finance (fin) - Depends on operations
4. Analytics (ana) - Depends on all data

## Status Tracking

Create MERGE_STATUS.md:
```markdown
# Merge Status

## Pending Merges
- [ ] ops/inventory-update
- [ ] fin/invoice-calculation  
- [ ] cfg/rate-settings
- [ ] ana/new-reports

## Completed Merges
- [x] ops/pallet-tracking (2024-01-15)
- [x] cfg/user-management (2024-01-14)
```