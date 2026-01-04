#!/bin/bash

###############################################################################
# Deploy Cloud Functions to GCP
# Usage: ./scripts/deploy-cloud-functions.sh [--test] [--dry-run]
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="second-brain-482901"
REGION="us-central1"
RUNTIME="nodejs20"
FUNCTIONS=("knowledge" "sync" "status")
FUNCTIONS_DIR="packages/gcp-functions"

# Flags
TEST_MODE=false
DRY_RUN=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --test)
      TEST_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}${1}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

run_command() {
  local cmd=$1
  local description=$2
  
  if [ "$VERBOSE" = true ]; then
    log_info "Running: $cmd"
  fi
  
  if [ "$DRY_RUN" = true ]; then
    log_warning "[DRY RUN] Would execute: $cmd"
    return 0
  fi
  
  if eval "$cmd"; then
    log_success "$description"
    return 0
  else
    log_error "Failed: $description"
    return 1
  fi
}

###############################################################################
# Pre-flight Checks
###############################################################################

log_section "Pre-flight Checks"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  log_error "gcloud CLI not found. Please install Google Cloud SDK."
  exit 1
fi
log_success "gcloud CLI found"

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
  log_error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi
log_success "gcloud authentication verified"

# Check project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  log_warning "Current project: $CURRENT_PROJECT, target: $PROJECT_ID"
  log_info "Setting project to $PROJECT_ID..."
  run_command "gcloud config set project $PROJECT_ID" "Project set"
fi
log_success "Project: $PROJECT_ID"

# Check if functions directory exists
if [ ! -d "$FUNCTIONS_DIR" ]; then
  log_error "Functions directory not found: $FUNCTIONS_DIR"
  exit 1
fi
log_success "Functions directory found: $FUNCTIONS_DIR"

# Check if package.json exists
if [ ! -f "$FUNCTIONS_DIR/package.json" ]; then
  log_error "package.json not found in $FUNCTIONS_DIR"
  exit 1
fi
log_success "package.json found"

###############################################################################
# Build Cloud Functions
###############################################################################

log_section "Building Cloud Functions"

cd "$FUNCTIONS_DIR"

# Install dependencies
log_info "Installing dependencies..."
if [ "$DRY_RUN" = false ]; then
  if npm install; then
    log_success "Dependencies installed"
  else
    log_error "Failed to install dependencies"
    exit 1
  fi
else
  log_warning "[DRY RUN] Would install dependencies"
fi

# Build TypeScript
log_info "Building TypeScript..."
if [ "$DRY_RUN" = false ]; then
  if npm run build; then
    log_success "TypeScript compiled"
  else
    log_error "Failed to compile TypeScript"
    exit 1
  fi
else
  log_warning "[DRY RUN] Would compile TypeScript"
fi

# Verify build output
if [ "$DRY_RUN" = false ] && [ ! -f "lib/index.js" ]; then
  log_error "Build output not found: lib/index.js"
  exit 1
fi
log_success "Build verified"

cd - > /dev/null

###############################################################################
# Deploy Functions
###############################################################################

log_section "Deploying Cloud Functions"

for FUNCTION in "${FUNCTIONS[@]}"; do
  log_info "Deploying function: $FUNCTION"
  
  DEPLOY_CMD="gcloud functions deploy $FUNCTION \
    --runtime $RUNTIME \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point=$FUNCTION \
    --source=$FUNCTIONS_DIR \
    --project=$PROJECT_ID \
    --region=$REGION \
    --quiet"
  
  if run_command "$DEPLOY_CMD" "Function deployed: $FUNCTION"; then
    if [ "$DRY_RUN" = false ]; then
      FUNCTION_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION"
      log_success "Function URL: $FUNCTION_URL"
    fi
  else
    log_error "Failed to deploy $FUNCTION"
    exit 1
  fi
done

###############################################################################
# Verify Deployment
###############################################################################

log_section "Verifying Deployment"

if [ "$DRY_RUN" = false ]; then
  for FUNCTION in "${FUNCTIONS[@]}"; do
    log_info "Checking function: $FUNCTION"
    
    if gcloud functions describe $FUNCTION \
      --region=$REGION \
      --project=$PROJECT_ID > /dev/null 2>&1; then
      
      STATUS=$(gcloud functions describe $FUNCTION \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status)")
      
      if [ "$STATUS" = "ACTIVE" ]; then
        log_success "Function $FUNCTION is ACTIVE"
      else
        log_warning "Function $FUNCTION status: $STATUS"
      fi
    else
      log_error "Function $FUNCTION not found"
    fi
  done
fi

###############################################################################
# Testing
###############################################################################

if [ "$TEST_MODE" = true ]; then
  log_section "Testing Cloud Functions"
  
  if [ "$DRY_RUN" = false ]; then
    for FUNCTION in "${FUNCTIONS[@]}"; do
      FUNCTION_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION"
      log_info "Testing: $FUNCTION_URL"
      
      RESPONSE=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL")
      HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
      BODY=$(echo "$RESPONSE" | head -n-1)
      
      if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "405" ]; then
        log_success "Function $FUNCTION responded with HTTP $HTTP_CODE"
        if [ "$VERBOSE" = true ]; then
          echo "Response: $BODY"
        fi
      else
        log_warning "Function $FUNCTION responded with HTTP $HTTP_CODE"
        if [ "$VERBOSE" = true ]; then
          echo "Response: $BODY"
        fi
      fi
    done
  else
    log_warning "[DRY RUN] Would test functions"
  fi
fi

###############################################################################
# Summary
###############################################################################

log_section "Deployment Summary"

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN MODE - No changes were made"
else
  log_success "Cloud Functions deployed successfully!"
  
  echo ""
  log_info "Function URLs:"
  for FUNCTION in "${FUNCTIONS[@]}"; do
    echo "  • https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION"
  done
  
  echo ""
  log_info "Next steps:"
  echo "  1. Update .env.production with the function URLs"
  echo "  2. Test with: curl https://$REGION-$PROJECT_ID.cloudfunctions.net/status"
  echo "  3. Deploy dashboard: pnpm --filter @ed/dashboard build && firebase deploy"
fi

echo ""
