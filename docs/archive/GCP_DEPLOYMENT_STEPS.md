# 🚀 GCP Deployment Instructions

## **Manual Console Setup (Required First Steps)**

You need to enable these APIs manually before running the deployment script:

### **1. Enable APIs in GCP Console**
Go to these URLs (replace `first-server-482901-m7` with your project ID):

1. **Cloud Resource Manager API**:  
   https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=first-server-482901-m7

2. **Gmail API**:  
   https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=first-server-482901-m7

3. **Cloud Storage API**:  
   https://console.developers.google.com/apis/api/storage.googleapis.com/overview?project=first-server-482901-m7

4. **Firestore API**:  
   https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=first-server-482901-m7

5. **Cloud Functions API**:  
   https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=first-server-482901-m7

6. **App Engine API**:  
   https://console.developers.google.com/apis/api/appengine.googleapis.com/overview?project=first-server-482901-m7

7. **Cloud Build API**:  
   https://console.developers.google.com/apis/api/cloudbuild.googleapis.com/overview?project=first-server-482901-m7

**Click "Enable" on each page. Wait 2-3 minutes between APIs.**

---

## **After Enabling APIs: Run Deployment Script**

```bash
# Make the script executable (already done)
chmod +x deploy-gcp.sh

# Run the deployment
./deploy-gcp.sh
```

---

## **Alternative: Manual Step-by-Step Commands**

If the script fails, run these commands individually:

### **1. Authentication**
```bash
gcloud auth activate-service-account --key-file=config/private.json
gcloud config set project first-server-482901-m7
```

### **2. Create Storage Bucket**
```bash
gsutil mb -p first-server-482901-m7 gs://rocketbook-habit-tracker
```

### **3. Create Firestore Database**
```bash
gcloud firestore databases create --region=us-central1
```

### **4. Deploy Cloud Functions**
```bash
cd rocketbook-webhook
npm install

gcloud functions deploy rocketbook-webhook \
    --runtime=nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=processGmailWebhook \
    --region=us-central1 \
    --service-account=second-brain@first-server-482901-m7.iam.gserviceaccount.com \
    --timeout=60s \
    --memory=256Mi

gcloud functions deploy rocketbook-insights \
    --runtime=nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=generateInsights \
    --region=us-central1 \
    --service-account=second-brain@first-server-482901-m7.iam.gserviceaccount.com \
    --timeout=60s \
    --memory=256Mi
```

---

## **What to Expect**

### **Successful Deployment Output:**
```
✅ Deployment Complete!

🎯 Function URLs:
Webhook: https://us-central1-first-server-482901-m7.cloudfunctions.net/rocketbook-webhook
Insights: https://us-central1-first-server-482901-m7.cloudfunctions.net/rocketbook-insights

📋 Next Steps:
1. Update Apps Script with webhook URL
2. Set up Gmail filter → 'Rocketbook' label
3. Test with a Rocketbook email
```

### **Common Issues & Fixes:**

**"API not enabled"** → Enable all APIs first (see links above)  
**"Permission denied"** → Grant service account more IAM roles  
**"Build failed"** → Wait a few minutes for APIs to propagate  

---

## **Post-Deployment Verification**

### **1. Test Cloud Functions:**
```bash
# Test webhook (returns success)
curl -X POST https://us-central1-first-server-482901-m7.cloudfunctions.net/rocketbook-webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# Test insights (returns empty results initially)
curl "https://us-central1-first-server-482901-m7.cloudfunctions.net/rocketbook-insights?timeframe=7d"
```

### **2. Check Resources:**
```bash
# List Cloud Functions
gcloud functions list

# List Storage buckets
gsutil ls

# Check Firestore collections
gcloud firestore collections list
```

---

## **Next Steps After Deployment**

1. **Update Apps Script** - Replace Gmail polling with webhook calls
2. **Set up Gmail Filter** - From: `notes@email.getrocketbook.com` → Label: `Rocketbook`
3. **Test End-to-End** - Send a Rocketbook email and verify data appears in Firestore
4. **Monitor** - Check Cloud Function logs for processing

Your Rocketbook Ignatian Examen system will then be running on enterprise-grade GCP infrastructure! 🎯