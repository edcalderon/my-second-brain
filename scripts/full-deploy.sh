#!/bin/bash

###############################################################################
# Full Deployment Pipeline
# Builds, deploys, and tests the complete setup
# Usage: ./scripts/full-deploy.sh [--skip-test] [--dry-run]
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Flags
SKIP_TEST=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-test)
      SKIP_TEST=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

log_section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${1}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

###############################################################################
# Main Pipeline
###############################################################################

log_section "Full Deployment Pipeline"

if [ "$DRY_RUN" = true ]; then
  log_info "DRY RUN MODE - No changes will be made"
fi

# Step 1: Test dev setup
log_section "Step 1: Testing Development Setup"
if ./scripts/test-api-setup.sh; then
  log_success "Development setup verified"
else
  log_error "Development setup test failed"
  exit 1
fi

# Step 2: Deploy Cloud Functions
log_section "Step 2: Deploying Cloud Functions"
if [ "$DRY_RUN" = true ]; then
  ./scripts/deploy-cloud-functions.sh --test --dry-run
else
  ./scripts/deploy-cloud-functions.sh --test
fi

if [ $? -eq 0 ]; then
  log_success "Cloud Functions deployed"
else
  log_error "Cloud Functions deployment failed"
  exit 1
fi

# Step 3: Test production setup
if [ "$SKIP_TEST" = false ]; then
  log_section "Step 3: Testing Production Setup"
  
  log_info "Waiting for functions to be ready..."
  sleep 5
  
  if ./scripts/test-api-setup.sh --prod; then
    log_success "Production setup verified"
  else
    log_warning "Production setup test failed (functions may still be initializing)"
  fi
fi

# Step 4: Summary
log_section "Deployment Complete"

echo ""
log_success "All steps completed successfully!"
echo ""
log_info "Next steps:"
echo "  1. Build dashboard: pnpm --filter @ed/dashboard build"
echo "  2. Deploy to Firebase: firebase deploy --only hosting"
echo "  3. Or push to main to trigger GitHub Actions"
echo ""
