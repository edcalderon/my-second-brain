# 🧪 End-to-End Testing Guide

## **System Architecture Verification**

Your Rocketbook system now has two deployment options:

### **Option 1: Simple (Drive + Sheets)**
- Files: `Rocketbook_Habit_Tracker.gs`
- Storage: Google Drive + Google Sheets
- Trigger: Apps Script polling every 5 minutes

### **Option 2: Enterprise (GCP Cloud Functions)**  
- Files: `Rocketbook_Habit_Tracker_AppsScript_GCP.gs`
- Storage: Cloud Storage + Firestore
- Trigger: Apps Script + Cloud Functions

---

## **Step 1: Deploy GCP Infrastructure**

### **Manual API Enablement (Must Do First)**
Visit each URL and click "Enable":

1. Cloud Resource Manager: https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=first-server-482901-m7
2. Gmail API: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=first-server-482901-m7
3. Cloud Storage: https://console.developers.google.com/apis/api/storage.googleapis.com/overview?project=first-server-482901-m7
4. Firestore: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=first-server-482901-m7
5. Cloud Functions: https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=first-server-482901-m7
6. App Engine: https://console.developers.google.com/apis/api/appengine.googleapis.com/overview?project=first-server-482901-m7
7. Cloud Build: https://console.developers.google.com/apis/api/cloudbuild.googleapis.com/overview?project=first-server-482901-m7

**Wait 2-3 minutes after each API enablement for propagation.**

### **Run Deployment Script**
```bash
./deploy-gcp.sh
```

---

## **Step 2: Apps Script Setup**

### **Choose Your Version**

**Simple Version:**
1. Go to [script.google.com](https://script.google.com)
2. Paste contents of `Rocketbook_Habit_Tracker.gs`
3. Run `setupRocketbookTracker()` once
4. Set up time trigger for `ingestRocketbook()` every 5 minutes

**GCP Version:**
1. Go to [script.google.com](https://script.google.com)
2. Paste contents of `Rocketbook_Habit_Tracker_AppsScript_GCP.gs`
3. **IMPORTANT**: Update `GCP_WEBHOOK_URL` with your deployed function URL
4. Run `setupRocketbookGCP()` once
5. Set up time trigger for `ingestRocketbook()` every 5 minutes

---

## **Step 3: Gmail Configuration**

### **Create Gmail Filter**
1. In Gmail, click the search bar → "Show search options"
2. From: `notes@email.getrocketbook.com`
3. Create filter → Apply label: `Rocketbook`
4. (Optional) Skip inbox

### **Verify Labels**
- `Rocketbook` - For unprocessed emails
- `Rocketbook/Processed` - Created automatically

---

## **Step 4: Testing Workflow**

### **Test 1: Apps Script Function**
```javascript
// In Apps Script editor, run:
testIngestion()        // For simple version
testGCPIntegration()    // For GCP version
```

### **Test 2: Manual Rocketbook Email**
1. Send a test to your Rocketbook email
2. Wait 5-10 minutes
3. Check:
   - Email moves to "Rocketbook/Processed" label
   - Simple: Google Sheet has new entry, Drive has file
   - GCP: Firestore has new document, Cloud Storage has file

### **Test 3: Cloud Function Directly**
```bash
# Test webhook (after getting your URL from deployment)
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "test-123",
    "threadId": "test-123", 
    "subject": "Test Rocketbook",
    "from": "notes@email.getrocketbook.com",
    "date": "2025-01-15T19:42:00.000Z",
    "attachmentContent": "What wrong did I do?\n- rage\n- smoking\n\nWhat good did I accomplish?\n- gratitude\n- walked 30min\n\nWhat did I forget to do?\n- send application",
    "attachmentName": "test-transcription.txt"
  }'

# Test insights (GCP version only)
curl "YOUR_INSIGHTS_URL?timeframe=7d"
```

---

## **Step 5: Dashboard Creation**

### **Simple Version**
- Data appears in "Rocketbook Habit Log" spreadsheet
- Use Google Sheets built-in charts for visualization

### **GCP Version**
- Run `createInsightsDashboard()` in Apps Script
- Creates "Rocketbook Insights Dashboard" spreadsheet
- Automatic habit pattern analysis

---

## **Verification Checklist**

### ✅ **Infrastructure**
- [ ] All 7 GCP APIs enabled
- [ ] Cloud Storage bucket created: `rocketbook-habit-tracker`
- [ ] Firestore database created
- [ ] Cloud Functions deployed and URLs obtained

### ✅ **Integration**
- [ ] Apps Script project created with correct code
- [ ] Gmail filter configured with "Rocketbook" label
- [ ] Time trigger set up (every 5 minutes)
- [ ] Service account has required permissions

### ✅ **Data Flow**
- [ ] Test email processed within 10 minutes
- [ ] Files appear in correct storage location
- [ ] Database entries created with proper structure
- [ ] Parsing extracts wrong/good/forgot arrays correctly

### ✅ **Insights**
- [ ] Dashboard created and populated
- [ ] Habit patterns calculated
- [ ] REST endpoints respond correctly

---

## **Troubleshooting**

### **Common Issues**

**"API not enabled"** → Enable all 7 APIs first (Step 1)

**"Permission denied"** → Check service account IAM roles

**No emails processed** → Verify Gmail filter and labels

**Cloud Function error** → Check logs in GCP Console → Cloud Functions

**Missing data in Firestore** → Check Cloud Function logs for processing errors

### **Debugging Commands**
```bash
# Check Cloud Function logs
gcloud functions logs read rocketbook-webhook --region=us-central1 --limit=50

# List Firestore documents
gcloud firestore documents list rocketbook-habit-tracker

# Verify Storage files
gsutil ls gs://rocketbook-habit-tracker/transcriptions/**/*
```

---

## **Success Metrics**

Your system is working when:
- ✅ Rocketbook emails auto-process within 5-10 minutes
- ✅ Structured data appears in database
- ✅ Dashboard shows habit patterns
- ✅ All components are monitored and logged
- ✅ Ready for AI integration and scaling

🎯 **Your Ignatian Examen habit tracking system is now enterprise-ready!**