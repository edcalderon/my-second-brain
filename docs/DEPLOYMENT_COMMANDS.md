# Deployment Commands Reference

Quick reference for all deployment and testing commands.

## Development Testing

### Test Dev Setup
```bash
# Test local development setup
pnpm test:api

# With verbose output
pnpm test:api:verbose
```

**What it does:**
- Checks if dev server is running
- Tests all API endpoints locally
- Verifies api-config.ts and environment files
- Validates Cloud Functions build structure

## Cloud Functions Deployment

### Deploy to GCP
```bash
# Deploy and test
pnpm deploy:cloud-functions:test

# Deploy without testing
pnpm deploy:cloud-functions

# Dry run (no changes)
pnpm deploy:cloud-functions:dry-run
```

**What it does:**
- Installs dependencies
- Compiles TypeScript
- Deploys to GCP Cloud Functions
- Optionally tests endpoints

### Test Production Setup
```bash
# Test production Cloud Functions
pnpm test:api:prod

# With verbose output
pnpm test:api:prod --verbose
```

**What it does:**
- Verifies Cloud Functions are deployed
- Tests all endpoints on production
- Checks connectivity to GCP

## Full Deployment Pipeline

### Complete Deployment
```bash
# Full pipeline: test dev → deploy functions → test prod
pnpm deploy:full

# Dry run
pnpm deploy:full:dry-run

# Skip production testing
pnpm deploy:full --skip-test
```

**What it does:**
1. Tests development setup
2. Deploys Cloud Functions
3. Tests production setup
4. Provides next steps

## Manual Commands

### Using Scripts Directly

```bash
# Deploy Cloud Functions
./scripts/deploy-cloud-functions.sh

# Deploy with testing
./scripts/deploy-cloud-functions.sh --test

# Deploy with verbose output
./scripts/deploy-cloud-functions.sh --verbose

# Test API setup
./scripts/test-api-setup.sh

# Test production
./scripts/test-api-setup.sh --prod

# Full deployment
./scripts/full-deploy.sh
```

### Using gcloud CLI

```bash
# List deployed functions
gcloud functions list --project=second-brain-482901

# Describe a function
gcloud functions describe knowledge --region=us-central1 --project=second-brain-482901

# View function logs
gcloud functions logs read knowledge --region=us-central1 --project=second-brain-482901

# Test a function
curl https://us-central1-second-brain-482901.cloudfunctions.net/status

# Delete a function
gcloud functions delete knowledge --region=us-central1 --project=second-brain-482901
```

## Workflow Examples

### First Time Setup

```bash
# 1. Start dev server
pnpm dev

# 2. Test dev setup (in another terminal)
pnpm test:api

# 3. Deploy Cloud Functions
pnpm deploy:cloud-functions:test

# 4. Test production
pnpm test:api:prod

# 5. Build and deploy dashboard
pnpm --filter @ed/dashboard build
firebase deploy --only hosting
```

### Update API Route

```bash
# 1. Create/update Next.js route
# apps/dashboard/src/app/api/[name]/route.ts

# 2. Update api-config.ts
# apps/dashboard/src/lib/api-config.ts

# 3. Create Cloud Function handler
# packages/gcp-functions/src/handlers/[name].ts

# 4. Register in Cloud Functions
# packages/gcp-functions/src/index.ts

# 5. Test locally
pnpm test:api

# 6. Deploy
pnpm deploy:cloud-functions:test

# 7. Test production
pnpm test:api:prod
```

### Continuous Deployment

```bash
# Push to main branch
git push origin main

# GitHub Actions will automatically:
# 1. Build static site
# 2. Deploy to Firebase Hosting
# 3. Deploy Cloud Functions
# 4. Run tests

# Monitor deployment
gcloud functions list --project=second-brain-482901
firebase hosting:sites:list --project=second-brain-482901
```

## Troubleshooting

### Dev server not responding
```bash
# Check if running
curl http://localhost:3000

# Start dev server
pnpm dev
```

### Cloud Functions not deploying
```bash
# Check authentication
gcloud auth list

# Set project
gcloud config set project second-brain-482901

# Check function status
gcloud functions describe knowledge --region=us-central1

# View deployment logs
gcloud functions logs read knowledge --region=us-central1
```

### API calls failing
```bash
# Test with verbose output
pnpm test:api:verbose
pnpm test:api:prod --verbose

# Check environment files
cat apps/dashboard/.env.development
cat apps/dashboard/.env.production

# Check api-config.ts
cat apps/dashboard/src/lib/api-config.ts
```

## Environment Variables

### Development (.env.development)
```
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CLOUD_FUNCTION_URL=http://localhost:3000
```

### Production (.env.production)
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://second-brain-482901.web.app
NEXT_PUBLIC_CLOUD_FUNCTION_URL=https://us-central1-second-brain-482901.cloudfunctions.net
```

## Function URLs

### Development
- Status: `http://localhost:3000/api/status`
- Knowledge: `http://localhost:3000/api/knowledge`
- Sync: `http://localhost:3000/api/sync`

### Production
- Status: `https://us-central1-second-brain-482901.cloudfunctions.net/status`
- Knowledge: `https://us-central1-second-brain-482901.cloudfunctions.net/knowledge`
- Sync: `https://us-central1-second-brain-482901.cloudfunctions.net/sync`

## Tips

- Use `--verbose` flag for detailed output
- Use `--dry-run` to preview changes without applying them
- Always test locally before deploying to production
- Check logs with `gcloud functions logs read [function-name]`
- Monitor deployments with `gcloud functions list`
