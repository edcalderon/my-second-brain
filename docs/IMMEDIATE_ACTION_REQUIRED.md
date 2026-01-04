# ⚠️ IMMEDIATE ACTION REQUIRED

## Issue: Rocketbook Sync Not Working

### Problem
New Rocketbook emails are not being synced to the knowledge base because the Cloud Function is missing the IMAP password.

### Error
```
Error: No password configured
```

### Current Status
- ✓ API endpoint working
- ✓ Cloud Function deployed
- ✓ Frontend UI functional
- ✗ **IMAP password missing in Cloud Function**

## Quick Fix (Choose One)

### Method 1: Using gcloud (Recommended)

```bash
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=[YOUR_PROJECT_ID] \
  --set-env-vars IMAP_PASSWORD='[YOUR_IMAP_PASSWORD]' \
  --quiet
```

### Method 2: Using Cloud Console

1. Go to: https://console.cloud.google.com/functions
2. Select project: `[YOUR_PROJECT_ID]`
3. Click on `rocketbook-fetch` function
4. Click "Edit"
5. Expand "Runtime settings"
6. Add environment variable:
   - **Name**: `IMAP_PASSWORD`
   - **Value**: `[YOUR_IMAP_PASSWORD]`
7. Click "Deploy"

### Method 3: Using Firebase CLI

```bash
firebase functions:config:set imap.password='[YOUR_IMAP_PASSWORD]'
firebase deploy --only functions
```

## Verification

After applying the fix, test it:

```bash
# Test the sync function
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

## Check Status

```bash
# View function environment variables
gcloud functions describe rocketbook-fetch \
  --region=us-central1 \
  --project=[YOUR_PROJECT_ID] \
  --format="value(serviceConfig.environmentVariables)"

# View function logs
gcloud functions logs read rocketbook-fetch \
  --region=us-central1 \
  --limit=20
```

## Timeline

1. **Now**: Apply one of the fixes above
2. **2-5 minutes**: Function redeploys
3. **After deployment**: Test with curl command
4. **Then**: Click "Sync" button in dashboard
5. **Result**: New Rocketbook emails should appear

## What's Happening

```
User clicks "Sync"
    ↓
POST /my-second-brain/api/sync
    ↓
Calls rocketbook-fetch Cloud Function
    ↓
Function connects to IMAP server (needs password)
    ↓
Fetches new emails from Rocketbook
    ↓
Processes and stores in Firestore
    ↓
Returns success response
    ↓
Dashboard updates with new entries
```

## Files Involved

- **Sync API**: `apps/dashboard/src/app/api/sync/route.ts`
- **Cloud Function**: `rocketbook-fetch` (deployed in GCP)
- **Email Server**: `imap.hostinger.com`
- **Database**: Firestore

## Credentials

```
Email Server: imap.hostinger.com
Username: [configured in environment variables]
Password: [configured in Secret Manager]
```

## After Fix

Once the password is set:

1. New Rocketbook emails will be automatically fetched
2. They'll appear in the Knowledge Base
3. The sync button will work properly
4. Dashboard will show updated entry count

## Support

If the fix doesn't work:

1. Check Cloud Function logs: `gcloud functions logs read rocketbook-fetch`
2. Verify IMAP credentials are correct
3. Check firewall/network settings
4. Verify Firestore permissions

---

**Priority**: HIGH
**Time to Fix**: 5-10 minutes
**Impact**: Rocketbook sync functionality
**Status**: Awaiting password configuration
