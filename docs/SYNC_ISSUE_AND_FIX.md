# Sync Issue: Rocketbook Emails Not Being Fetched

## Problem

New Rocketbook emails (like "Rocketbook Scan - 2026-01-04 01.16.54") are not being synced to the knowledge base.

## Root Cause

The `rocketbook-fetch` Cloud Function is missing the IMAP password in its environment variables.

### Current Status
```
IMAP_HOST: imap.hostinger.com
IMAP_USER: [configured in environment variables]
IMAP_PASSWORD: '' (EMPTY - THIS IS THE PROBLEM)
```

### Error Message
```
Error: No password configured
```

## Solution

Update the Cloud Function environment variables with the IMAP password:

### Option 1: Using gcloud CLI

```bash
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=[YOUR_PROJECT_ID] \
  --set-env-vars IMAP_PASSWORD='[YOUR_IMAP_PASSWORD]' \
  --no-gen2
```

### Option 2: Using Cloud Console

1. Go to Cloud Functions in GCP Console
2. Click on `rocketbook-fetch`
3. Click "Edit"
4. Go to "Runtime settings"
5. Add/Update environment variable:
   - Name: `IMAP_PASSWORD`
   - Value: `[YOUR_IMAP_PASSWORD]`
6. Click "Deploy"

### Option 3: Update via Firebase Config

Add to `.env.gcloud`:
```
IMAP_PASSWORD=[YOUR_IMAP_PASSWORD]
```

Then deploy:
```bash
firebase deploy --only functions
```

## Verification

After updating, test the function:

```bash
curl -X POST https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/rocketbook-fetch \
  -H "Content-Type: application/json" \
  -d '{"force":true}'
```

Expected response:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "processed": 1,
  "timestamp": "2026-01-04T..."
}
```

## How Sync Works

1. **Frontend**: User clicks "Sync" button on Knowledge page
2. **API Call**: Sends POST to `/my-second-brain/api/sync`
3. **Dev Mode**: Returns mock response (no external call)
4. **Prod Mode**: Calls `rocketbook-fetch` Cloud Function
5. **Function**: Connects to Hostinger IMAP server
6. **Fetch**: Retrieves new emails from Rocketbook
7. **Process**: Extracts and stores in Firestore
8. **Response**: Returns count of processed items

## Current Sync Status

### Working
- ✓ API endpoint responding
- ✓ Cloud Function deployed
- ✓ Firestore connection working
- ✓ Frontend UI functional

### Not Working
- ✗ IMAP password missing
- ✗ Email fetching failing
- ✗ New emails not syncing

## Next Steps

1. **Update IMAP Password** (Choose one option above)
2. **Wait for Deployment** (Usually 2-5 minutes)
3. **Test Sync** (Use curl command above)
4. **Verify in Dashboard** (Check if new emails appear)

## Files Involved

- **Frontend**: `apps/dashboard/src/app/knowledge/page.tsx` - Sync button
- **API Route**: `apps/dashboard/src/app/api/sync/route.ts` - Routes to Cloud Function
- **Cloud Function**: `rocketbook-fetch` - Fetches from email server
- **Database**: Firestore - Stores knowledge entries

## Troubleshooting

### Still getting "No password configured"
- Verify the environment variable was actually set
- Check function revision is updated
- Try redeploying the function

### Emails still not appearing
- Check Firestore for new entries
- View Cloud Function logs: `gcloud functions logs read rocketbook-fetch`
- Verify IMAP credentials are correct

### Function timeout
- Check email server connectivity
- Verify firewall rules allow outbound IMAP
- Increase function timeout if needed

## Related Commands

```bash
# Check function status
gcloud functions describe rocketbook-fetch --region=us-central1

# View function logs
gcloud functions logs read rocketbook-fetch --region=us-central1 --limit=50

# List all functions
gcloud functions list --project=[YOUR_PROJECT_ID]

# Redeploy function
gcloud functions deploy rocketbook-fetch --region=us-central1 --source=packages/gcp-functions
```

---

**Status**: Awaiting IMAP password configuration
**Action Required**: Update Cloud Function environment variables
**Estimated Fix Time**: 5-10 minutes
