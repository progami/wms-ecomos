# GitHub Configuration

This directory contains GitHub-specific configuration for CI/CD and automation.

## Workflows

The `.github/workflows/` directory contains automated workflows that run on every commit:

### Core Test Workflows
- **tests.yml**: Runs all unit tests, E2E tests, linting, and build checks
- **playwright.yml**: Runs E2E tests across all browsers (Chrome, Firefox, Safari)
- **pr-checks.yml**: Comprehensive validation for pull requests

### Quality & Security
- **code-quality.yml**: SonarCloud analysis, CodeQL security scanning, accessibility tests
- **nightly-tests.yml**: Extended test suite that runs overnight
- **deploy.yml**: Deployment pipeline with staging and production environments

### Automation
- **dependabot.yml**: Automated dependency updates

## Test Matrix

Tests run on every commit include:
- ✅ Unit tests with Jest
- ✅ E2E tests with Playwright (all browsers)
- ✅ TypeScript type checking
- ✅ ESLint and Prettier checks
- ✅ Build verification
- ✅ Database migration tests
- ✅ Security scanning
- ✅ Accessibility testing

## Required Secrets

Add these secrets to your repository settings:

### For Testing
- `SONAR_TOKEN`: SonarCloud authentication token

### For Staging Deployment
- `STAGING_DATABASE_URL`: PostgreSQL connection string
- `STAGING_NEXTAUTH_SECRET`: NextAuth secret for staging
- `STAGING_URL`: Staging environment URL

### For Production Deployment
- `PRODUCTION_DATABASE_URL`: PostgreSQL connection string
- `PRODUCTION_NEXTAUTH_SECRET`: NextAuth secret for production
- `PRODUCTION_URL`: Production environment URL

## Branch Protection

Recommended branch protection rules for `main`:
- Require pull request reviews
- Require status checks to pass:
  - `quick-checks`
  - `unit-tests`
  - `e2e-smoke-tests`
  - `build-check`
  - `security-scan`
- Require branches to be up to date
- Include administrators

## Workflow Status Badges

Add to your README:
```markdown
![Tests](https://github.com/[owner]/[repo]/workflows/Tests/badge.svg)
![Code Quality](https://github.com/[owner]/[repo]/workflows/Code%20Quality/badge.svg)
![Security](https://github.com/[owner]/[repo]/workflows/PR%20Checks/badge.svg)
```