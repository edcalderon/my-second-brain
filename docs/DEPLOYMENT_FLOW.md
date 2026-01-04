# Deployment Flow: Dev to Prod

## Overview

This setup enables seamless API routing between development and production environments:

- **Development**: Next.js API routes run locally as server functions
- **Production**: Same routes deployed as GCP Cloud Functions with static site on Firebase Hosting

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

## Environment Configuration

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

## API Routes

All routes are defined in `apps/dashboard/src/app/api/`:

- `/api/knowledge` - Knowledge management
- `/api/sync` - Synchronization
- `/api/status` - Status checks

## Development Workflow

1. **Start local server**:
   ```bash
   pnpm --filter @ed/dashboard dev
   ```
   - API routes run as Next.js server functions
   - All requests go to `http://localhost:3000/api/*`

2. **Make API calls**:
   ```typescript
   import { apiCall } from '@/lib/api-config';
   
   const data = await apiCall('knowledge', {
     method: 'POST',
     body: JSON.stringify({ /* data */ })
   });
   ```

## Production Deployment

### Prerequisites

1. **GitHub Secrets** (set in repository settings):
   - `WIF_PROVIDER`: Workload Identity Federation provider
   - `WIF_SERVICE_ACCOUNT`: Service account email
   - `FIREBASE_TOKEN`: Firebase CLI token

2. **GCP Setup**:
   ```bash
   # Enable required APIs
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable firebasehosting.googleapis.com
   ```

### Deployment Process

1. **Push to main branch**:
   ```bash
   git push origin main
   ```

2. **GitHub Actions triggers**:
   - Builds Next.js dashboard (static export)
   - Deploys static site to Firebase Hosting
   - Deploys Cloud Functions (knowledge, sync, status)

3. **Verification**:
   ```bash
   # Check Cloud Functions
   gcloud functions list --project=second-brain-482901
   
   # Check Firebase Hosting
   firebase hosting:sites:list --project=second-brain-482901
   ```

## API Route Mapping

### Next.js Routes → Cloud Functions

| Next.js Route | Cloud Function | URL |
|---|---|---|
| `/api/knowledge` | `knowledge` | `https://us-central1-second-brain-482901.cloudfunctions.net/knowledge` |
| `/api/sync` | `sync` | `https://us-central1-second-brain-482901.cloudfunctions.net/sync` |
| `/api/status` | `status` | `https://us-central1-second-brain-482901.cloudfunctions.net/status` |

## Cloning API Routes

To add a new API route:

1. **Create Next.js route** (`apps/dashboard/src/app/api/[name]/route.ts`):
   ```typescript
   export async function POST(request: Request) {
     // Handler logic
   }
   ```

2. **Add to API config** (`apps/dashboard/src/lib/api-config.ts`):
   ```typescript
   routes: {
     // ... existing routes
     newRoute: '/api/new-route',
   }
   ```

3. **Create Cloud Function handler** (`packages/gcp-functions/src/handlers/[name].ts`):
   ```typescript
   export async function handleNewRoute(req: Request, res: Response) {
     // Same logic as Next.js route
   }
   ```

4. **Add to Cloud Functions** (`packages/gcp-functions/src/index.ts`):
   ```typescript
   export const newRoute = functions.https.onRequest(async (req, res) => {
     if (handleCors(req, res)) return;
     try {
       await handleNewRoute(req, res);
     } catch (error) {
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   ```

## Troubleshooting

### Local API calls fail
- Ensure dev server is running: `pnpm --filter @ed/dashboard dev`
- Check `.env.development` is loaded
- Verify `NODE_ENV=development`

### Cloud Functions not responding
- Check deployment status: `gcloud functions describe [function-name]`
- View logs: `gcloud functions logs read [function-name]`
- Verify CORS headers are set correctly

### Static site not updating
- Clear Firebase cache: `firebase hosting:disable`
- Redeploy: `firebase deploy --only hosting`

## Local Testing of Cloud Functions

To test Cloud Functions locally before deployment:

```bash
# Install Firebase emulator
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only functions

# Functions will be available at:
# http://localhost:5001/second-brain-482901/us-central1/[function-name]
```

Update `.env.development` to point to emulator:
```
NEXT_PUBLIC_CLOUD_FUNCTION_URL=http://localhost:5001/second-brain-482901/us-central1
```
