# Production Deployment Checklist

This checklist ensures a safe and successful deployment to production.

## Pre-Deployment

### Code Quality
- [ ] All tests pass: `npm run test`
- [ ] TypeScript builds without errors: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] No console.log statements in production code
- [ ] Error boundaries are in place

### Security
- [ ] Environment variables are set in production
- [ ] NEXTAUTH_SECRET is a strong, unique key (min 32 characters)
- [ ] Database credentials are secure and not in code
- [ ] Admin-only access is enforced in production
- [ ] Rate limiting is configured
- [ ] CSRF protection is enabled
- [ ] Security headers are configured

### Database
- [ ] Production database is provisioned
- [ ] Database migrations are up to date: `npx prisma migrate deploy`
- [ ] Database indexes are created
- [ ] Backup strategy is in place
- [ ] Connection pooling is configured

### Performance
- [ ] Build optimizations are enabled
- [ ] Static assets are minified
- [ ] Images are optimized
- [ ] Caching strategies are implemented

## Deployment Steps

1. **Environment Setup**
   ```bash
   # Copy production environment variables
   cp .env.production.example .env.production
   # Fill in all required values
   ```

2. **Database Migration**
   ```bash
   # Run migrations on production database
   DATABASE_URL="your-production-db-url" npx prisma migrate deploy
   ```

3. **Build Application**
   ```bash
   # Create production build
   npm run build
   ```

4. **Health Check**
   ```bash
   # Verify the application starts
   npm start
   # Check health endpoint: http://localhost:3000/api/health
   ```

5. **Deploy to Hosting**
   - For AWS: Use the provided Terraform configuration
   - For Vercel: Connect GitHub repository
   - For Docker: Use the provided Dockerfile

## Post-Deployment

### Verification
- [ ] Application is accessible at production URL
- [ ] Health check endpoint returns healthy status
- [ ] Authentication works correctly
- [ ] Admin users can log in
- [ ] Basic operations work (receive, ship, inventory)

### Monitoring
- [ ] Error tracking is configured (if using Sentry)
- [ ] Logs are being collected
- [ ] Performance metrics are being tracked
- [ ] Alerts are configured for critical issues

### Documentation
- [ ] Production URL is documented
- [ ] Admin credentials are securely stored
- [ ] Runbook is created for common issues
- [ ] Team is trained on the application

## Rollback Plan

If issues occur:

1. **Immediate Rollback**
   ```bash
   # Revert to previous version
   git checkout <previous-version-tag>
   npm run build
   npm start
   ```

2. **Database Rollback** (if schema changed)
   ```bash
   # Restore from backup
   # Apply down migration if available
   ```

3. **Communication**
   - Notify team of rollback
   - Document issues encountered
   - Plan fixes for next deployment

## Security Reminders

- Never commit secrets to git
- Rotate credentials regularly
- Monitor for suspicious activity
- Keep dependencies updated
- Review security logs weekly

## Support

For deployment issues:
1. Check logs at `/logs/prod.log`
2. Verify environment variables
3. Check database connectivity
4. Review error tracking dashboard

Remember: **Always test in staging before production!**