# Branching and Pull Request Strategy

## Overview

This document outlines the branching strategy for multi-agent development on the Warehouse Management System. Each agent works on their own branch and creates pull requests to merge into the main branch.

## Branch Naming Convention

Each agent should create branches following this pattern:
- `{module-prefix}/{feature-or-task-name}`

Module prefixes:
- `ops/` - Operations module (inventory, receive, ship)
- `fin/` - Finance module (invoices, reconciliation)
- `cfg/` - Configuration module (products, locations, rates)
- `rpt/` - Analytics module - Reports
- `int/` - Analytics module - Integrations (Amazon FBA)
- `adm/` - Admin module
- `fix/` - Bug fixes (any module)
- `docs/` - Documentation updates

Examples:
- `ops/add-bulk-receive`
- `fin/invoice-validation`
- `cfg/multi-warehouse-rates`
- `fix/inventory-calculation`

## Workflow

### 1. Starting Work
```bash
# Always start from latest main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b ops/my-feature

# If working on existing branch
git checkout ops/my-feature
git merge main  # or rebase if preferred
```

### 2. During Development
```bash
# Commit frequently with clear messages
git add .
git commit -m "feat(ops): Add validation for batch numbers"

# Push to remote regularly
git push origin ops/my-feature

# Keep branch updated with main (daily)
git checkout main
git pull origin main
git checkout ops/my-feature
git merge main
```

### 3. Commit Message Format
Follow conventional commits:
```
type(module): Brief description

Longer explanation if needed.

Fixes #123
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Examples:
- `feat(ops): Add batch lot auto-increment`
- `fix(fin): Correct invoice date filtering`
- `docs(cfg): Update rate configuration guide`

### 4. Creating Pull Request

Before creating PR:
```bash
# Ensure tests pass
npm test

# Ensure build succeeds
npm run build

# Update from main one final time
git checkout main
git pull origin main
git checkout ops/my-feature
git merge main

# Push final changes
git push origin ops/my-feature
```

PR Title Format:
- `[OPS] Add bulk receive functionality`
- `[FIN] Fix invoice reconciliation calculations`
- `[CFG] Add multi-currency support to rates`

PR Description Template:
```markdown
## Summary
Brief description of changes

## Changes Made
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
- [ ] Unit tests pass
- [ ] Build succeeds
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots]

## Related Issues
Fixes #123
Relates to #456
```

## Module Boundaries and Rules

### 1. Operations Module (`/operations`)
**Can modify:**
- `/src/app/operations/*`
- `/src/components/warehouse/*`
- `/src/app/api/inventory/*`
- `/src/app/api/transactions/*`
- `/src/lib/calculations/inventory-*.ts`

**Cannot modify without approval:**
- Database schema (coordinate with DBA/Architect)
- Shared components
- Other module's files

### 2. Finance Module (`/finance`)
**Can modify:**
- `/src/app/finance/*`
- `/src/components/finance/*`
- `/src/app/api/invoices/*`
- `/src/app/api/reconciliation/*`
- `/src/lib/calculations/cost-*.ts`

**Read-only access to:**
- Inventory data (via APIs)
- Configuration data

### 3. Configuration Module (`/config`)
**Can modify:**
- `/src/app/config/*`
- `/src/app/api/skus/*`
- `/src/app/api/warehouses/*`
- `/src/app/api/rates/*`

**Special permission needed:**
- Modifying core entities (SKU, Warehouse models)

### 4. Analytics Module (`/reports` & `/integrations`)
**Can modify:**
- `/src/app/reports/*`
- `/src/app/integrations/*`
- `/src/components/reports/*`
- `/src/app/api/reports/*`
- `/src/app/api/export/*`
- `/src/app/api/amazon/*`
- `/src/lib/amazon/*`

**Read-only access to:**
- All other modules (via APIs only)

**Cannot modify:**
- Core business logic
- Inventory transactions
- Financial calculations

### 5. Admin Module (`/admin`)
**Can modify:**
- `/src/app/admin/*`
- `/src/app/api/admin/*`
- `/src/app/api/users/*`

**Special permissions:**
- Can modify authentication logic
- Can modify user permissions

## PR Review Process

### Review Checklist
1. **Code Quality**
   - [ ] Follows TypeScript best practices
   - [ ] No TypeScript errors
   - [ ] Proper error handling
   - [ ] No console.logs in production code

2. **Module Boundaries**
   - [ ] Only modifies allowed files
   - [ ] Uses APIs for cross-module communication
   - [ ] No direct database access from UI components

3. **Testing**
   - [ ] New features have tests
   - [ ] Existing tests still pass
   - [ ] Edge cases considered

4. **Documentation**
   - [ ] Code comments for complex logic
   - [ ] README updated if needed
   - [ ] API changes documented

5. **Performance**
   - [ ] No N+1 queries
   - [ ] Appropriate caching used
   - [ ] Large datasets paginated

### Auto-checks (GitHub Actions)
```yaml
- TypeScript compilation
- ESLint
- Unit tests
- Build verification
- Bundle size check
```

## Merge Strategy

### PR Master Responsibilities
The PR Master (you) will:
1. Review PRs for adherence to module boundaries
2. Ensure no conflicts between concurrent PRs
3. Coordinate database schema changes
4. Maintain build stability
5. Resolve merge conflicts when needed
6. Tag releases appropriately

### Merge Rules
1. All PRs require approval from PR Master
2. All checks must pass
3. Branch must be up-to-date with main
4. No direct commits to main (except hotfixes)

### Conflict Resolution
When conflicts occur:
1. Agent updates their branch from main
2. Agent resolves conflicts locally
3. Agent pushes resolved branch
4. PR Master reviews resolution

## Emergency Procedures

### Hotfix Process
For critical production bugs:
```bash
git checkout main
git pull origin main
git checkout -b fix/critical-bug
# Make minimal fix
git push origin fix/critical-bug
# Create PR with [HOTFIX] prefix
```

### Rollback Process
If a merge causes issues:
```bash
git checkout main
git revert <merge-commit>
git push origin main
```

## Best Practices

### Do's
- ✅ Keep PRs small and focused
- ✅ Update branch from main daily
- ✅ Write clear commit messages
- ✅ Test thoroughly before PR
- ✅ Document breaking changes
- ✅ Use feature flags for large changes

### Don'ts
- ❌ Modify other module's internals
- ❌ Skip tests to save time
- ❌ Merge without PR Master approval
- ❌ Include unrelated changes in PR
- ❌ Force push to shared branches
- ❌ Commit sensitive data

## Alternative Strategies Considered

### 1. Mono-repo with Workspaces
**Pros:** Better isolation, independent versioning
**Cons:** More complex setup, harder to share code

### 2. Microservices
**Pros:** Complete isolation, independent deployment
**Cons:** Overhead for current project size

### 3. Feature Branches Only
**Pros:** Simpler
**Cons:** No clear ownership, more conflicts

## Recommendation

The proposed strategy of **module-based branches with PR Master review** is appropriate for this project because:

1. **Clear Ownership**: Each agent owns their module
2. **Controlled Integration**: PR Master ensures quality
3. **Stable Main Branch**: All code is reviewed before merge
4. **Audit Trail**: PRs document all changes
5. **Rollback Capability**: Easy to revert problematic changes

However, consider these enhancements:

### 1. Automated Module Boundary Checking
Create a GitHub Action that validates PR changes stay within module boundaries:
```yaml
- name: Check Module Boundaries
  run: |
    node scripts/check-module-boundaries.js ${{ github.head_ref }}
```

### 2. Integration Testing Branch
Consider a `staging` branch for integration testing:
```
main <- staging <- feature branches
```

### 3. Module-specific Test Suites
Each module should have its own test command:
```json
{
  "scripts": {
    "test:ops": "jest src/app/operations",
    "test:fin": "jest src/app/finance",
    "test:cfg": "jest src/app/config"
  }
}
```

### 4. API Versioning
As modules evolve independently, consider API versioning:
```typescript
// /api/v1/inventory/* - stable
// /api/v2/inventory/* - experimental
```

## Success Metrics

Track these metrics to measure strategy effectiveness:
1. Average PR review time
2. Number of merge conflicts per week
3. Build failure rate
4. Time from PR to production
5. Number of rollbacks needed

## Conclusion

This branching strategy provides a good balance between:
- **Autonomy**: Agents can work independently
- **Quality**: All changes are reviewed
- **Stability**: Main branch stays deployable
- **Flexibility**: Easy to adapt as team grows

The strategy is "fool-proof" in that it prevents most common issues, but success depends on:
1. Agents following the guidelines
2. PR Master being responsive
3. Good communication between agents
4. Continuous improvement based on metrics