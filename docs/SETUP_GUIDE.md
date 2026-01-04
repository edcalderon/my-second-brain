# Setup Guide: Dev/Prod API Routing

## Quick Start

### 1. Development Setup

```bash
# Install dependencies
pnpm install

# Start dev server (uses local API routes)
pnpm --filter @ed/dashboard dev
```

The dashboard will be available at `http://localhost:3000` with all API calls routing to local Next.js server functions.

### 2. Environment Files

Three environment configurations are provided:

- `.env` - Root workspace config (GCP credentials, etc.)
- `apps/dashboard/.env.development` - Dev mode (local routes)
- `apps/dashboard/.env.production` - Prod mode (cloud functions)

### 3. Making API Calls

Use the `apiCall` helper from `@/lib/api-config`:

```typescript
import { apiCall } from '@/lib/api-config';

// Automatically routes to correct endpoint based on NODE_ENV
const result = await apiCall('knowledge', {
  method: 'POST',
  body: JSON.stringify({ query: 'test' })
});
```

## Production Deployment

### Prerequisites

1. **GitHub Secrets** (add to repository):
   - `WIF_PROVIDER` - Workload Identity Federation provider URL
   - `WIF_SERVICE_ACCOUNT` - Service account email
   - `FIREBASE_TOKEN` - Firebase CLI token

2. **GCP Setup**:
   ```bash
   gcloud auth login
   gcloud config set project second-brain-482901
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

### Deploy

Push to main branch:
```bash
git push origin main
```

GitHub Actions will:
1. Build static Next.js site
2. Deploy to Firebase Hosting
3. Deploy Cloud Functions

### Verify Deployment

```bash
# Check Cloud Functions
gcloud functions list --project=second-brain-482901

# Check Firebase Hosting
firebase hosting:sites:list --project=second-brain-482901

# Test Cloud Function
curl https://us-central1-second-brain-482901.cloudfunctions.net/status
```

## Adding New API Routes

### Step 1: Create Next.js Route

Create `apps/dashboard/src/app/api/[name]/route.ts`:

```typescript
export async function POST(request: Request) {
  const data = await request.json();
  // Your logic here
  return Response.json({ success: true });
}
```

### Step 2: Update API Config

Edit `apps/dashboard/src/lib/api-config.ts`:

```typescript
routes: {
  knowledge: '/api/knowledge',
  sync: '/api/sync',
  status: '/api/status',
  newRoute: '/api/new-route',  // Add here
}
```

### Step 3: Create Cloud Function Handler

Create `packages/gcp-functions/src/handlers/[name].ts`:

```typescript
import { Request, Response } from 'express';

export async function handleNewRoute(req: Request, res: Response) {
  // Same logic as Next.js route
  res.status(200).json({ success: true });
}
```

### Step 4: Register in Cloud Functions

Edit `packages/gcp-functions/src/index.ts`:

```typescript
import { handleNewRoute } from './handlers/new-route';

export const newRoute = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    await handleNewRoute(req, res);
  } catch (error) {
    console.error('New route error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Local Testing

### Test Dev Mode

```bash
pnpm --filter @ed/dashboard dev
# API calls go to http://localhost:3000/api/*
```

### Test Cloud Functions Locally

```bash
# Install Firebase emulator
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only functions

# Update .env.development to use emulator
NEXT_PUBLIC_CLOUD_FUNCTION_URL=http://localhost:5001/second-brain-482901/us-central1
```

## Troubleshooting

### API calls fail in dev
- Check dev server is running: `pnpm --filter @ed/dashboard dev`
- Verify `.env.development` is loaded
- Check browser console for CORS errors

### Cloud Functions not deploying
- Verify GCP project ID: `gcloud config get-value project`
- Check service account permissions
- View deployment logs: `gcloud functions logs read [function-name]`

### Static site not updating
- Clear Firebase cache: `firebase hosting:disable`
- Rebuild: `pnpm --filter @ed/dashboard build`
- Redeploy: `firebase deploy --only hosting`

## File Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── knowledge/route.ts
│   │   │   ├── sync/route.ts
│   │   │   └── status/route.ts
│   │   └── ...
│   └── lib/
│       └── api-config.ts          ← API routing logic
├── .env.development               ← Dev config
├── .env.production                ← Prod config
└── ...

packages/gcp-functions/
├── src/
│   ├── index.ts                   ← Cloud Functions entry
│   └── handlers/
│       ├── knowledge.ts
│       ├── sync.ts
│       └── status.ts
├── package.json
└── tsconfig.json

.github/workflows/
└── deploy-static.yml              ← CI/CD pipeline
```
