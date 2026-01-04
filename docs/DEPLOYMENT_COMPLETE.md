# Deployment Complete ✓

Successfully set up dev/prod API routing with Cloud Functions deployment.

## Status

### Development ✓
- **Dev Server**: Running at `http://localhost:3000`
- **API Routes**: All endpoints responding
  - `GET /my-second-brain/api/status` → 200 OK
  - `GET /my-second-brain/api/knowledge` → 200 OK
  - `POST /my-second-brain/api/sync` → 200 OK

### Production ✓
- **Cloud Functions**: Deployed to GCP
- **Endpoints**: All functions active
  - `GET https://us-central1-second-brain-482901.cloudfunctions.net/status` → 200 OK
  - `GET https://us-central1-second-brain-482901.cloudfunctions.net/knowledge` → 200 OK
  - `POST https://us-central1-second-brain-482901.cloudfunctions.net/sync` → 200 OK

## What Was Set Up

### 1. API Configuration Layer
- **File**: `apps/dashboard/src/lib/api-config.ts`
- **Purpose**: Smart routing that switches between local and cloud endpoints based on environment
- **Functions**:
  - `getApiEndpoint()` - Returns correct URL for environment
  - `apiCall()` - Fetch wrapper with automatic endpoint selection

### 2. Environment Configuration
- **Dev**: `apps/dashboard/.env.development` - Routes to localhost
- **Prod**: `apps/dashboard/.env.production` - Routes to Cloud Functions

### 3. Cloud Functions Package
- **Location**: `packages/gcp-functions/`
- **Functions**: knowledge, sync, status
- **Handlers**: Mirrored from Next.js API routes

### 4. Deployment Scripts
- **Deploy**: `./scripts/deploy-cloud-functions.sh` - Builds and deploys to GCP
- **Test Dev**: `./scripts/test-api-setup.sh` - Tests local setup
- **Test Prod**: `./scripts/test-api-setup.sh --prod` - Tests Cloud Functions
- **Full Pipeline**: `./scripts/full-deploy.sh` - Complete workflow

### 5. Next.js Configuration
- **File**: `apps/dashboard/next.config.mjs`
- **Change**: Dynamic output mode for dev (allows API routes), static export for prod

## Quick Commands

```bash
# Test development setup
pnpm test:api

# Deploy Cloud Functions
pnpm deploy:cloud-functions:test

# Test production
pnpm test:api:prod

# Full deployment pipeline
pnpm deploy:full
```

## How It Works

### Development Flow
1. Start dev server: `pnpm dev`
2. API calls route to `http://localhost:3000/my-second-brain/api/*`
3. Next.js handles requests as server functions
4. Instant feedback during development

### Production Flow
1. Build static site: `pnpm --filter @ed/dashboard build`
2. Deploy to Firebase Hosting
3. API calls route to Cloud Functions
4. Scalable, serverless architecture

## API Usage

### In Components
```typescript
import { apiCall } from '@/lib/api-config';

// Automatically uses correct endpoint
const data = await apiCall('knowledge', {
  method: 'POST',
  body: JSON.stringify({ query: 'test' })
});
```

### Manual Requests
```bash
# Dev
curl http://localhost:3000/my-second-brain/api/status

# Prod
curl https://us-central1-second-brain-482901.cloudfunctions.net/status
```

## Next Steps

1. **Build Dashboard**
   ```bash
   pnpm --filter @ed/dashboard build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy --only hosting
   ```

3. **Or Push to Main**
   - GitHub Actions will automatically:
     - Build static site
     - Deploy to Firebase Hosting
     - Deploy Cloud Functions

## Monitoring

### Check Cloud Functions
```bash
gcloud functions list --project=second-brain-482901
```

### View Logs
```bash
gcloud functions logs read knowledge --region=us-central1
```

### Test Endpoints
```bash
# Status
curl https://us-central1-second-brain-482901.cloudfunctions.net/status

# Knowledge
curl https://us-central1-second-brain-482901.cloudfunctions.net/knowledge

# Sync
curl -X POST https://us-central1-second-brain-482901.cloudfunctions.net/sync
```

## Files Created/Modified

### New Files
- `apps/dashboard/src/lib/api-config.ts` - API routing layer
- `apps/dashboard/.env.development` - Dev environment
- `apps/dashboard/.env.production` - Prod environment
- `packages/gcp-functions/` - Cloud Functions package
- `scripts/deploy-cloud-functions.sh` - Deployment script
- `scripts/test-api-setup.sh` - Testing script
- `scripts/full-deploy.sh` - Full pipeline
- `docs/DEPLOYMENT_FLOW.md` - Architecture docs
- `docs/SETUP_GUIDE.md` - Setup instructions
- `docs/DEPLOYMENT_COMMANDS.md` - Command reference

### Modified Files
- `apps/dashboard/next.config.mjs` - Dynamic output for dev
- `apps/dashboard/src/app/api/status/route.ts` - Added dynamic export
- `apps/dashboard/src/app/api/knowledge/route.ts` - Added dynamic export
- `apps/dashboard/src/app/api/sync/route.ts` - Added dynamic export
- `package.json` - Added deployment scripts

## Troubleshooting

### Dev server not responding
```bash
pnpm dev
```

### Cloud Functions not deploying
```bash
gcloud auth login
gcloud config set project second-brain-482901
pnpm deploy:cloud-functions:test
```

### API calls failing
```bash
# Check dev setup
pnpm test:api --verbose

# Check prod setup
pnpm test:api:prod --verbose
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   API Config Layer     │
        │  (getApiEndpoint)      │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    DEV MODE          PROD MODE
    ┌──────────┐      ┌──────────────────┐
    │ Local    │      │ Cloud Functions  │
    │ Next.js  │      │ (GCP)            │
    │ Routes   │      │                  │
    └──────────┘      └──────────────────┘
```

---

**Status**: ✓ Ready for production
**Last Updated**: 2026-01-04
