# 📋 Agent Communication Protocol

## Overview
Each agent has their own communication file to prevent merge conflicts. This document outlines how agents should communicate with each other.

---

## Communication Files
- `OPERATIONS_AGENT.md` - Operations Agent's file
- `CONFIGURATION_AGENT.md` - Configuration Agent's file  
- `FINANCE_AGENT.md` - Finance Agent's file
- `ANALYTICS_AGENT.md` - Analytics Agent's file
- `PR_MASTER.md` - Orchestrator's status tracking

---

## How to Send a Message

### 1. Write in YOUR File
When you need something from another agent, write in YOUR OWN file under "Messages to Other Agents":

```markdown
### To: [Agent Name]
**Date**: YYYY-MM-DD HH:MM  
**Status**: PENDING  
**Subject**: Brief description

Detailed message here...

**Action Required**: What you need them to do
```

### 2. Message Status Types
- `PENDING` - Waiting for response
- `IN_PROGRESS` - Other agent is working on it
- `RESOLVED` - Issue resolved
- `BLOCKED` - Cannot proceed without help
- `DECLINED` - Request rejected (with reason)

---

## How to Respond to a Message

### 1. Check Other Agent Files
Regularly check other agent files for messages addressed to you.

### 2. Copy to Your File
Copy the message to YOUR file under "Messages from Other Agents":

```markdown
### From: [Agent Name]
**Date**: YYYY-MM-DD HH:MM  
**Status**: IN_PROGRESS  
**Subject**: Brief description

[Original message]

**My Response**: Working on this...
```

### 3. Write Your Response
In YOUR file under "Messages to Other Agents":

```markdown
### To: [Original Agent]
**Date**: YYYY-MM-DD HH:MM  
**Status**: RESOLVED  
**Subject**: Re: [Original Subject]

Response details...

**Action Taken**: What you did
```

---

## Example Communication Flow

### Step 1: Config Agent has an issue
In `CONFIGURATION_AGENT.md`:
```markdown
### To: Operations Agent
**Date**: 2025-01-06 14:30  
**Status**: PENDING  
**Subject**: Batch dropdown filtering issue

The batch dropdown in ship page shows all batches regardless of SKU selection.

**Action Required**: Fix filtering to show only batches for selected SKU
```

### Step 2: Operations Agent sees message
In `OPERATIONS_AGENT.md`:
```markdown
### From: Configuration Agent
**Date**: 2025-01-06 14:30  
**Status**: IN_PROGRESS  
**Subject**: Batch dropdown filtering issue

[Copies original message]

**My Response**: Investigating the issue now
```

### Step 3: Operations Agent responds
In `OPERATIONS_AGENT.md`:
```markdown
### To: Configuration Agent
**Date**: 2025-01-06 15:00  
**Status**: RESOLVED  
**Subject**: Re: Batch dropdown filtering issue

Fixed in commit abc123. The dropdown now properly filters by SKU.

**Action Taken**: Updated filter logic in ship/page.tsx
```

### Step 4: Config Agent acknowledges
Updates status in their original message to `RESOLVED`.

---

## Orchestrator's Role

The PR Master (Orchestrator) will:
1. **Monitor** all agent files daily
2. **Track** unresolved issues in `PR_MASTER.md`
3. **Escalate** blocked items
4. **Coordinate** architectural decisions
5. **Resolve** conflicts between agents

---

## Best Practices

### DO:
- ✅ Check other agent files at least twice daily
- ✅ Respond within 24 hours
- ✅ Be specific about what you need
- ✅ Update status promptly
- ✅ Include relevant code/file references
- ✅ Copy important messages to your file

### DON'T:
- ❌ Edit other agents' files
- ❌ Delete old messages (keep for history)
- ❌ Make architectural decisions alone
- ❌ Ignore messages for more than 24 hours
- ❌ Implement changes that affect other modules without discussion

---

## Escalation Path

If an issue is not resolved within 48 hours:
1. Update status to `BLOCKED`
2. PR Master will intervene
3. Architectural decisions will be made collaboratively
4. Solution will be documented in all affected agent files

---

## Quick Reference

| Your Role | Your File | Check These Files |
|-----------|-----------|-------------------|
| Operations | OPERATIONS_AGENT.md | All others daily |
| Configuration | CONFIGURATION_AGENT.md | All others daily |
| Finance | FINANCE_AGENT.md | All others daily |
| Analytics | ANALYTICS_AGENT.md | All others daily |
| PR Master | PR_MASTER.md | ALL files multiple times daily |

---

## Important Notes

1. **Version Control**: All communication files are tracked in git
2. **Transparency**: All agents can see all communications
3. **Accountability**: Each message has a timestamp and status
4. **No Direct Edits**: Only edit your own file
5. **Archive Policy**: Old resolved issues can be moved to an archive section after 30 days

---

## Start Communicating!

Remember: Clear communication prevents bugs and architectural issues. When in doubt, over-communicate!