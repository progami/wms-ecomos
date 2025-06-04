# Claude Squad Integration Guide

## Overview
This guide explains how to use Claude Squad with our multi-agent module development strategy.

## Installation

```bash
# Install Claude Squad
brew tap smtg-ai/tap
brew install claude-squad

# Or manual installation
curl -fsSL https://raw.githubusercontent.com/smtg-ai/claude-squad/main/install.sh | bash
```

## Prerequisites
- tmux
- GitHub CLI (gh)
- Claude Code or other AI coding assistants

## Setting Up Module-Based Agents

### 1. Initialize Claude Squad
```bash
cd /path/to/warehouse-management
claude-squad
```

### 2. Create Agent Sessions by Module

#### Operations Agent
```bash
# In Claude Squad TUI
# Create new session: ops-agent
# Branch: ops/inventory-bulk-upload
# Task: "Implement bulk inventory upload feature in /operations module"
```

#### Finance Agent
```bash
# Create new session: fin-agent  
# Branch: fin/invoice-templates
# Task: "Add invoice template system in /finance module"
```

#### Config Agent
```bash
# Create new session: cfg-agent
# Branch: cfg/rate-inheritance  
# Task: "Implement rate inheritance for warehouse configs in /config module"
```

#### Analytics Agent (Reports + Integrations)
```bash
# Create new session: analytics-agent
# Branch: rpt/custom-reports or int/amazon-updates
# Task: "Work on analytics features in /reports and /integrations modules"
```

#### Admin Agent
```bash
# Create new session: adm-agent
# Branch: adm/user-permissions
# Task: "Enhance user permission system in /admin module"
```

### 3. Agent Task Templates

Use these templates when creating agent tasks:

#### Operations Module Tasks
```
You are the Operations Agent. You can ONLY modify files in:
- /src/app/operations/*
- /src/components/warehouse/*
- /src/app/api/inventory/*
- /src/app/api/transactions/*
- /src/lib/calculations/inventory-*.ts

Current task: [SPECIFIC TASK]
Branch: ops/[FEATURE-NAME]

Remember:
- Use existing SKU and Warehouse APIs (don't modify them)
- Emit events for cross-module communication
- Follow the existing transaction patterns
```

#### Finance Module Tasks
```
You are the Finance Agent. You can ONLY modify files in:
- /src/app/finance/*
- /src/components/finance/*
- /src/app/api/invoices/*
- /src/app/api/reconciliation/*
- /src/lib/calculations/cost-*.ts

Current task: [SPECIFIC TASK]
Branch: fin/[FEATURE-NAME]

Remember:
- Read inventory data via APIs only
- Cannot modify inventory logic directly
- Follow existing invoice/reconciliation patterns
```

#### Config Module Tasks
```
You are the Config Agent. You can ONLY modify files in:
- /src/app/config/*
- /src/app/api/skus/*
- /src/app/api/warehouses/*
- /src/app/api/rates/*
- /src/app/api/warehouse-configs/*

Current task: [SPECIFIC TASK]
Branch: cfg/[FEATURE-NAME]

Remember:
- Changes to core entities need approval
- Maintain backward compatibility
- Update validation logic appropriately
```

#### Analytics Module Tasks (Reports + Integrations)
```
You are the Analytics Agent. You can ONLY modify files in:
- /src/app/reports/*
- /src/app/integrations/*
- /src/components/reports/*
- /src/app/api/reports/*
- /src/app/api/export/*
- /src/app/api/amazon/*
- /src/lib/amazon/*

Current task: [SPECIFIC TASK]
Branch: rpt/[FEATURE-NAME] or int/[FEATURE-NAME]

Remember:
- Read-only access to all business data
- Cannot modify core business logic
- Focus on data aggregation and visualization
- Use existing APIs to fetch data
```

#### Admin Module Tasks
```
You are the Admin Agent. You can ONLY modify files in:
- /src/app/admin/*
- /src/app/api/admin/*
- /src/app/api/users/*
- /src/lib/auth.ts (with caution)

Current task: [SPECIFIC TASK]
Branch: adm/[FEATURE-NAME]

Remember:
- Be extra careful with authentication changes
- Document security implications
- Test permission changes thoroughly
```

## PR Master Workflow with Claude Squad

### 1. Daily Monitoring
```bash
# Start Claude Squad
claude-squad

# View all active agents
# Check their progress
# Review any stuck agents
```

### 2. Pre-PR Review Process
```bash
# In Claude Squad TUI:
1. Select agent session
2. Pause the agent (if needed)
3. Review changes in their worktree
4. If good: Allow agent to create PR
5. If issues: Provide feedback to agent
```

### 3. Coordinating Multiple Agents
When agents need to work on related features:

```bash
# Example: Config agent needs to add a new field that Operations will use

# 1. Config Agent Task
"Add 'requiresTemperatureControl' field to SKU model in /config module"

# 2. Wait for Config PR to merge

# 3. Operations Agent Task  
"Update receive page to show temperature control warning for SKUs that require it"
```

### 4. Handling Conflicts
```bash
# If agents have conflicting changes:
1. Pause both agents
2. Review changes in both worktrees
3. Decide on resolution approach
4. Resume one agent with specific instructions
5. After first PR merges, update second agent's branch
```

## Best Practices

### 1. Agent Isolation
- Each agent should have clear module boundaries in their task description
- Remind agents of their allowed directories at task start
- Use the pause feature if agents start modifying wrong files

### 2. Task Sizing
- Keep tasks small and focused (2-4 hours of work)
- Break large features into multiple sequential tasks
- One task = one PR

### 3. Communication Between Agents
- Use the Claude Squad interface to coordinate
- Document shared interfaces in the task descriptions
- Have agents emit events rather than direct module calls

### 4. Testing Strategy
```bash
# Before allowing PR creation:
1. Check agent ran module-specific tests
2. Verify build passes in their worktree
3. Run integration tests if changes affect APIs
```

## Example Multi-Agent Workflow

### Scenario: Add temperature-controlled inventory tracking

#### Phase 1: Configuration
```bash
# Config Agent Session
Task: "Add temperature control fields to SKU and Warehouse models"
Branch: cfg/temperature-control
Files to modify:
- /src/app/config/products/*
- /src/app/api/skus/*
- Update Prisma schema
```

#### Phase 2: Operations
```bash
# Operations Agent Session (after Config PR merges)
Task: "Add temperature validation to receive/ship operations"
Branch: ops/temperature-validation
Files to modify:
- /src/app/operations/receive/page.tsx
- /src/app/operations/ship/page.tsx
- /src/app/api/transactions/route.ts
```

#### Phase 3: Finance
```bash
# Finance Agent Session
Task: "Add temperature-controlled storage surcharge calculations"
Branch: fin/temperature-surcharge
Files to modify:
- /src/app/finance/dashboard/*
- /src/lib/calculations/cost-*.ts
```

#### Phase 4: Reports
```bash
# Reports Agent Session
Task: "Add temperature-controlled inventory report"
Branch: rpt/temperature-report
Files to modify:
- /src/app/reports/*
- /src/app/api/reports/*
```

## Monitoring and Metrics

Track these metrics with Claude Squad:
1. Tasks completed per agent per day
2. PR approval rate by module
3. Average task completion time
4. Number of cross-module conflicts

## Troubleshooting

### Agent Going Off-Track
1. Pause the agent immediately
2. Review their changes
3. Reset their task with clearer boundaries
4. Resume with specific constraints

### Worktree Conflicts
```bash
# If worktree gets corrupted
git worktree remove warehouse-management-ops
git worktree add -b ops/new-feature warehouse-management-ops
```

### Agent Communication Issues
- Use explicit task dependencies
- Document API changes clearly
- Have agents check for merged PRs before starting dependent work

## Security Considerations

1. Each agent only has access to their module directories
2. Use read-only API access for cross-module data
3. Review all PRs for security implications
4. Don't let agents modify authentication or authorization code

## Conclusion

Claude Squad enhances our multi-agent strategy by providing:
- True workspace isolation via git worktrees
- Real-time monitoring and control
- Efficient task management
- Reduced merge conflicts

Combined with our module boundaries and PR process, this creates a robust system for parallel AI-assisted development.