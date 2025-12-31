# GCP Rocketbook Deployment Configuration

## 🚀 **GCP Integration Setup Guide**

Your service account: `your-service-account@your-project-id.iam.gserviceaccount.com`  
Project ID: `your-project-id`

---

## **Step 1: Cloud Storage Setup**

### Create Storage Bucket
```bash
# Using gcloud CLI
gsutil mb gs://rocketbook-habit-tracker

# Or via GCP Console:
# 1. Go to Cloud Storage > Browser
# 2. Create bucket
# 3. Name: "rocketbook-habit-tracker"
# 4. Location: Multi-region (us or global)
# 5. Storage class: Standard
# 6. Access control: Uniform
```

### Folder Structure
The system will automatically create:
```
gs://rocketbook-habit-tracker/
└── transcriptions/
    ├── 2025/
    │   ├── 01/
    │   ├── 02/
    │   └── ...
    └── 2026/
        └── ...
```

---

## **Step 2: Firestore Database**

### Create Firestore Instance
```bash
# Via gcloud
gcloud firestore databases create --region=us-central1

# Or via GCP Console:
# 1. Go to Firestore
# 2. Create database
# 3. Choose Native mode
# 4. Select region (us-central1 recommended)
```

### Collection Schema
Collection: `habit_entries`

Document Structure:
```json
{
  "entry_id": "uuid",
  "received_at": "2025-01-15T19:42:00.000Z",
  "gmail_thread_id": "abc123",
  "gmail_message_id": "def456",
  "from": "notes@email.getrocketbook.com",
  "subject": "RB 2025-01-15 19.42.00.pdf",
  "attachment_name": "RB 2025-01-15 19.42.00-transcription-beta.txt",
  "cloud_storage_url": "gs://rocketbook-habit-tracker/transcriptions/2025/01/uuid-filename.txt",
  "raw_text": "full transcription content...",
  "parsed_data": {
    "wrong": ["rage", "smoking"],
    "good": ["gratitude", "walked 30min"],
    "forgot": ["send application"],
    "raw": "full text",
    "source": "rocketbook"
  },
  "processed_at": "2025-01-15T19:45:00.000Z",
  "source": "rocketbook",
  "project_id": "first-server-482901-m7"
}
```

---

## **Step 3: Enable APIs**

### Required Google Cloud APIs
```bash
gcloud services enable gmail.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable appengine.googleapis.com
```

---

## **Step 4: Service Account Permissions**

### Grant Required Roles
```bash
# Service account email
SA_EMAIL="your-service-account@your-project-id.iam.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding first-server-482901-m7 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/gmail.user"

gcloud projects add-iam-policy-binding first-server-482901-m7 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding first-server-482901-m7 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/firestore.dataAdmin"

gcloud projects add-iam-policy-binding first-server-482901-m7 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudfunctions.developer"
```

---

## **Step 5: Apps Script GCP Integration**

### Update Apps Script Project
1. Open your Apps Script project
2. Go to **Project Settings** ⚙️
3. Copy the **Script ID** 
4. In GCP Console, go to **IAM & Admin > Service Accounts**
5. Select your service account
6. Add **Apps Script API** scope or enable delegation

### Configure Service Account in Apps Script
```javascript
// Add to top of Rocketbook_Habit_Tracker_GCP.gs
const SERVICE_ACCOUNT_KEY = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n[your-private-key]\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
};
```

---

## **Step 6: Cloud Function for Webhook (Optional but Recommended)**

### Create Cloud Function
```bash
# Create function directory
mkdir rocketbook-webhook
cd rocketbook-webhook

# Create index.js (see next section)
# Create package.json (see next section)

# Deploy function
gcloud functions deploy rocketbook-webhook \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=processGmailWebhook \
  --region=us-central1
```

### `package.json`
```json
{
  "name": "rocketbook-webhook",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/firestore": "^7.0.0",
    "@google-cloud/storage": "^7.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

---

## **Step 7: Gmail Webhook Setup (Advanced)**

### Option A: Google Workspace Admin Console
1. Go to **Google Workspace Admin Console**
2. **Apps > Google Workspace > Gmail**
3. **Webhook Configuration**
4. Add your Cloud Function URL
5. Configure to watch Rocketbook emails

### Option B: Cloud Scheduler + Pub/Sub
```bash
# Create Pub/Sub topic
gcloud pubsub topics create rocketbook-processing

# Create Cloud Scheduler job
gcloud scheduler jobs create http rocketbook-schedule \
  --schedule="*/5 * * * *" \
  --http-method=POST \
  --uri="https://your-cloud-function-url" \
  --oidc-service-account-email="$SA_EMAIL"
```

---

## **Step 8: Testing & Verification**

### Manual Test Commands
```bash
# Test Cloud Storage access
gsutil ls gs://rocketbook-habit-tracker/

# Test Firestore
gcloud firestore collections list

# Test Cloud Function
curl -X POST https://your-function-url
```

### Apps Script Test
1. In Apps Script editor, run `testGCPIntegration()`
2. Check execution logs
3. Verify Cloud Storage files appear
4. Check Firestore documents are created
5. Confirm backup spreadsheet updates

---

## **Monitoring & Logging**

### Cloud Monitoring Setup
```bash
# Create log-based metric
gcloud logging metrics create rocketbook-processes \
  --description="Rocketbook email processing count" \
  --log-filter='resource.type="cloud_function" AND resource.labels.function_name="rocketbook-webhook"'

# Set up alerts
gcloud alpha monitoring policies create --policy-from-file=rocketbook-alert.yaml
```

### Log Filtering
```bash
# View processing logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=rocketbook-webhook" --limit=50
```

---

## **Migration Path to Full AI System**

Once GCP infrastructure is running, you can add:

1. **Vector Database**: Add vector embeddings to Firestore or use Pinecone
2. **AI Processing**: Cloud Function calls Vertex AI for habit insights
3. **Analytics**: BigQuery pipeline from Firestore
4. **Frontend**: Cloud Run app with Vue.js/React for dashboard
5. **API**: Cloud Functions for mobile app integration

---

## **Cost Estimates (Monthly)**

- Cloud Storage: ~$2/month (10GB)
- Firestore: ~$5/month (50k reads/writes)
- Cloud Functions: ~$1/month (1M executions)
- **Total**: ~$8/month for personal scale

---

## **Next Steps**

1. **Deploy infrastructure** using commands above
2. **Update Apps Script** with GCP version
3. **Test with a Rocketbook email**
4. **Verify Firestore entries** appear correctly
5. **Scale up** to AI insights when ready

Your system will now be enterprise-ready with cloud persistence, scalability, and the foundation for advanced AI-driven habit analytics!