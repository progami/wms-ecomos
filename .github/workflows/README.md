# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Warehouse Management System.

## Workflows

### tests.yml - Main Test Suite
**Triggers**: Push to main/develop, Pull requests
**Purpose**: Runs all tests on every commit
**Jobs**:
- Unit tests with coverage
- E2E tests with Playwright
- Lint and type checking
- Build verification
- Database migration tests

### playwright.yml - Browser Testing
**Triggers**: Push to main/develop, Pull requests
**Purpose**: Runs E2E tests across all browsers
**Jobs**:
- Tests on Chromium, Firefox, and WebKit
- Mobile browser testing (Chrome, Safari)
- Parallel execution for speed

### pr-checks.yml - Pull Request Validation
**Triggers**: Pull request events
**Purpose**: Comprehensive PR validation
**Jobs**:
- Quick checks (lint, format, type-check)
- Unit tests with coverage thresholds
- E2E smoke tests (critical paths only)
- Database migration safety checks
- Build analysis
- Security scanning

### nightly-tests.yml - Extended Test Suite
**Triggers**: Daily at 2 AM UTC, Manual
**Purpose**: Comprehensive overnight testing
**Jobs**:
- Full test suite with all browsers
- Performance testing with Lighthouse
- Bundle size analysis
- Extended E2E scenarios

### deploy.yml - Deployment Pipeline
**Triggers**: Push to main, Manual
**Purpose**: Automated deployment with safety checks
**Jobs**:
- Run full test suite
- Deploy to staging
- Staging smoke tests
- Deploy to production (with approval)
- Production verification

## Environment Variables

Required secrets for workflows:
```
# Testing
DATABASE_URL=postgresql://user:pass@localhost:5432/db_test
NEXTAUTH_SECRET=test-secret

# Staging
STAGING_DATABASE_URL=postgresql://...
STAGING_NEXTAUTH_SECRET=...
STAGING_URL=https://staging.example.com

# Production
PRODUCTION_DATABASE_URL=postgresql://...
PRODUCTION_NEXTAUTH_SECRET=...
PRODUCTION_URL=https://app.example.com
```

## Status Badges

Add these to your README:
```markdown
![Tests](https://github.com/[owner]/[repo]/workflows/Tests/badge.svg)
![Playwright Tests](https://github.com/[owner]/[repo]/workflows/Playwright%20Tests/badge.svg)
![Deploy](https://github.com/[owner]/[repo]/workflows/Deploy/badge.svg)
```

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):
```bash
# Run tests workflow
act -W .github/workflows/tests.yml

# Run with specific event
act pull_request -W .github/workflows/pr-checks.yml
```

## Workflow Optimization

- Tests run in parallel where possible
- Dependencies are cached between runs
- Only affected tests run on PRs
- Database services use health checks
- Artifacts are retained for debugging

## Troubleshooting

### Test Failures
1. Check uploaded artifacts for screenshots/videos
2. Review test logs in Actions tab
3. Run tests locally to reproduce

### Database Issues
1. Ensure migrations are up to date
2. Check DATABASE_URL is correct
3. Verify Postgres service is healthy

### Build Failures
1. Clear cache and retry
2. Check for dependency conflicts
3. Ensure Prisma client is generated

## Adding New Workflows

1. Create workflow file in `.github/workflows/`
2. Define triggers (on: push, pull_request, etc.)
3. Set up jobs with appropriate steps
4. Add required secrets to repository settings
5. Test with a PR before merging