#!/bin/bash
set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📂 Loading variables from .env..."
    export $(grep -v '^#' .env | xargs)
fi

# core config
PROJECT_ID=${GCP_PROJECT_ID:-"second-brain-482901"}
BUCKET_NAME=${GCP_BUCKET_NAME:-"rocketbook-habit-tracker-$PROJECT_ID"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_ACCOUNT=${SERVICE_ACCOUNT:-"admin-second-brain@second-brain-482901.iam.gserviceaccount.com"}
PROJECT_NUMBER=${PROJECT_NUMBER:-"544207038128"}

# Hostinger IMAP config
IMAP_HOST=${IMAP_HOST:-"imap.hostinger.com"}
IMAP_USER=${IMAP_USER:-"edward@lealsystem.net"}

echo "🚀 Deploying Rocketbook Knowledge Base to GCP..."

echo "📝 Verifying authentication..."
gcloud auth activate-service-account --key-file=../config/private.json
gcloud config set project $PROJECT_ID -q

echo "🔧 Enabling required APIs..."
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    storage.googleapis.com \
    firestore.googleapis.com \
    cloudfunctions.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com

echo "📦 Creating Cloud Storage bucket..."
gsutil mb -l $REGION -p $PROJECT_ID gs://$BUCKET_NAME || echo "Bucket already exists"

echo "🗄️ Creating Firestore database..."
gcloud firestore databases create --location=$REGION || echo "Firestore database already exists"

echo "🔐 Granting service account permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.objectAdmin" || echo "Note: storage role already active or failed"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/datastore.owner" || echo "Note: firestore/datastore role already active or failed"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/aiplatform.user" || echo "Note: Vertex AI role already active or failed"

# Deployment permissions for the build agent
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" || echo "Note: build SA role already active or failed"

gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT \
    --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser" || echo "Note: build SA user role already active or failed"

echo "☁️ Deploying Cloud Functions..."
cd ../packages/gcp-functions

if [ -z "$IMAP_PASSWORD" ]; then
    echo "⚠️  WARNING: IMAP_PASSWORD is not set. The fetch function will fail to connect until it is set in the GCP Console."
fi

echo "Deploying email fetch function (Hostinger IMAP)..."
gcloud functions deploy rocketbook-fetch -q \
    --runtime=nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=fetchFromHostinger \
    --region=$REGION \
    --service-account=$SERVICE_ACCOUNT \
    --timeout=60s \
    --memory=512Mi \
    --set-env-vars "IMAP_HOST=$IMAP_HOST,IMAP_USER=$IMAP_USER,IMAP_PASSWORD=$IMAP_PASSWORD,GCP_PROJECT_ID=$PROJECT_ID"

cd ..

echo "🔗 Getting Cloud Function URL..."
FETCH_URL=$(gcloud functions describe rocketbook-fetch --region=$REGION --format='value(url)')

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🎯 Function URL:"
echo "Email Fetch: $FETCH_URL"
echo ""
echo "📋 Next Steps:"
echo "1. Go to GCP Console -> Cloud Scheduler"
echo "2. Create a job to hit $FETCH_URL every 15 minutes"
echo "3. Ensure your Rocketbook app sends scans to edward@lealsystem.net"