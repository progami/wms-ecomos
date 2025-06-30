# Suggested Commands for WMS Development

## Development
```bash
# Start development server
npm run dev

# Start with logging
npm run dev:logged

# Build for production
npm run build

# Start production server
npm start
```

## Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific component tests
cd tests && jest unit/components/ui/button.test.tsx
```

## Database
```bash
# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Generate Prisma client
npm run db:generate

# Seed database
npm run db:seed
```

## Code Quality
```bash
# Run ESLint
npm run lint

# Run TypeScript type checking
npm run type-check

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

## Demo Data
```bash
# Generate demo data
npm run demo:generate

# Clear demo data
npm run demo:clear
```

## Logs
```bash
# Setup logging
npm run logs:setup

# Tail development logs
npm run logs:tail

# Clear logs
npm run logs:clear

# Test logging
npm run logs:test
```

## Git Commands
```bash
# Check status
git status

# Stage changes
git add .

# Commit with conventional format
git commit -m "feat(components): add new Button component"

# Push to remote
git push origin main

# Create new branch
git checkout -b feature/new-feature

# Stash changes
git stash

# Apply stash
git stash pop
```

## System Commands (macOS/Darwin)
```bash
# List files with details
ls -la

# Find files
find . -name "*.tsx" -type f

# Search in files (use ripgrep)
rg "search term" --type ts

# Check disk usage
du -sh *

# Monitor processes
top

# Check port usage
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i:3000)
```

## NPM/Package Management
```bash
# Install dependencies
npm install

# Install dev dependency
npm install --save-dev package-name

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Clean install
rm -rf node_modules package-lock.json && npm install
```

## Docker (if needed)
```bash
# Build image
docker build -t wms-app .

# Run container
docker run -p 3000:3000 wms-app

# Docker compose
docker-compose up -d

# View logs
docker-compose logs -f
```