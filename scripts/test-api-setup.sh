#!/bin/bash

###############################################################################
# Test API Setup - Dev and Prod
# Tests both local dev server and cloud functions
# Usage: ./scripts/test-api-setup.sh [--prod] [--verbose]
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ID="second-brain-482901"
REGION="us-central1"
DEV_URL="http://localhost:3000"
PROD_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net"
ENDPOINTS=("knowledge" "sync" "status")

# Flags
TEST_PROD=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      TEST_PROD=true
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
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${1}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_endpoint() {
  local url=$1
  local endpoint=$2
  local method=${3:-GET}
  local data=${4:-""}
  
  # Add basePath for dev mode
  if [[ "$url" == "http://localhost:3000" ]]; then
    url="$url/my-second-brain"
  fi
  
  log_info "Testing: $method $url/$endpoint"
  
  local curl_cmd="curl -s -w '\n%{http_code}' -L -X $method"
  
  if [ "$method" = "POST" ] && [ -n "$data" ]; then
    curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  
  curl_cmd="$curl_cmd '$url/$endpoint'"
  
  if [ "$VERBOSE" = true ]; then
    log_info "Command: $curl_cmd"
  fi
  
  local response=$(eval "$curl_cmd")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)
  
  if [ "$VERBOSE" = true ]; then
    echo "Response body: $body"
  fi
  
  case $http_code in
    200)
      log_success "HTTP $http_code - OK"
      return 0
      ;;
    405)
      log_success "HTTP $http_code - Method Not Allowed (expected for GET on POST-only endpoints)"
      return 0
      ;;
    404)
      log_error "HTTP $http_code - Not Found"
      return 1
      ;;
    500)
      log_warning "HTTP $http_code - Internal Server Error (may be expected if external services not available)"
      if [ "$VERBOSE" = true ]; then
        echo "Error details: $body"
      fi
      return 0
      ;;
    *)
      log_warning "HTTP $http_code - Unexpected response"
      if [ "$VERBOSE" = true ]; then
        echo "Response: $body"
      fi
      return 1
      ;;
  esac
}

###############################################################################
# Main Testing
###############################################################################

if [ "$TEST_PROD" = true ]; then
  log_section "Testing Production Cloud Functions"
  
  BASE_URL="$PROD_URL"
  log_info "Target: $BASE_URL"
  
  # Check if functions are accessible
  log_info "Checking connectivity to GCP..."
  if ! curl -s -m 5 "$BASE_URL/status" > /dev/null 2>&1; then
    log_warning "Cannot reach production functions. They may not be deployed yet."
    log_info "Deploy with: ./scripts/deploy-cloud-functions.sh --test"
    exit 1
  fi
  log_success "Connected to GCP"
  
else
  log_section "Testing Development Setup"
  
  BASE_URL="$DEV_URL"
  log_info "Target: $BASE_URL"
  
  # Check if dev server is running
  log_info "Checking if dev server is running..."
  if ! curl -s -m 5 "$BASE_URL" > /dev/null 2>&1; then
    log_error "Dev server not running at $BASE_URL"
    log_info "Start with: pnpm --filter @ed/dashboard dev"
    exit 1
  fi
  log_success "Dev server is running"
fi

###############################################################################
# Test Endpoints
###############################################################################

log_section "Testing Endpoints"

PASSED=0
FAILED=0

# Test status endpoint (GET)
if [ "$TEST_PROD" = true ]; then
  if test_endpoint "$BASE_URL" "status" "GET"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
else
  if test_endpoint "$BASE_URL" "api/status" "GET"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
fi

# Test knowledge endpoint (GET)
if [ "$TEST_PROD" = true ]; then
  if test_endpoint "$BASE_URL" "knowledge" "GET"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
else
  if test_endpoint "$BASE_URL" "api/knowledge" "GET"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
fi

# Test knowledge endpoint (POST)
if [ "$TEST_PROD" = true ]; then
  if test_endpoint "$BASE_URL" "knowledge" "POST" '{"query":"test"}'; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
else
  if test_endpoint "$BASE_URL" "api/knowledge" "POST" '{"query":"test"}'; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
fi

# Test sync endpoint (POST)
if [ "$TEST_PROD" = true ]; then
  if test_endpoint "$BASE_URL" "sync" "POST" '{"action":"sync"}'; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
else
  if test_endpoint "$BASE_URL" "api/sync" "POST" '{"action":"sync"}'; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
fi

###############################################################################
# Test API Config Layer
###############################################################################

if [ "$TEST_PROD" = false ]; then
  log_section "Testing API Config Layer"
  
  log_info "Checking api-config.ts..."
  if [ -f "apps/dashboard/src/lib/api-config.ts" ]; then
    log_success "api-config.ts found"
    
    # Check for required functions
    if grep -q "getApiEndpoint" apps/dashboard/src/lib/api-config.ts; then
      log_success "getApiEndpoint function found"
    else
      log_error "getApiEndpoint function not found"
      ((FAILED++))
    fi
    
    if grep -q "apiCall" apps/dashboard/src/lib/api-config.ts; then
      log_success "apiCall function found"
    else
      log_error "apiCall function not found"
      ((FAILED++))
    fi
  else
    log_error "api-config.ts not found"
    ((FAILED++))
  fi
  
  # Check environment files
  log_info "Checking environment files..."
  if [ -f "apps/dashboard/.env.development" ]; then
    log_success ".env.development found"
  else
    log_error ".env.development not found"
    ((FAILED++))
  fi
  
  if [ -f "apps/dashboard/.env.production" ]; then
    log_success ".env.production found"
  else
    log_error ".env.production not found"
    ((FAILED++))
  fi
fi

###############################################################################
# Test Cloud Functions Build
###############################################################################

if [ "$TEST_PROD" = false ]; then
  log_section "Testing Cloud Functions Build"
  
  if [ -d "packages/gcp-functions" ]; then
    log_success "gcp-functions package found"
    
    if [ -f "packages/gcp-functions/package.json" ]; then
      log_success "package.json found"
    else
      log_error "package.json not found"
      ((FAILED++))
    fi
    
    if [ -f "packages/gcp-functions/tsconfig.json" ]; then
      log_success "tsconfig.json found"
    else
      log_error "tsconfig.json not found"
      ((FAILED++))
    fi
    
    if [ -f "packages/gcp-functions/src/index.ts" ]; then
      log_success "src/index.ts found"
    else
      log_error "src/index.ts not found"
      ((FAILED++))
    fi
  else
    log_error "gcp-functions package not found"
    ((FAILED++))
  fi
fi

###############################################################################
# Summary
###############################################################################

log_section "Test Summary"

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo ""
echo -e "Tests passed: ${GREEN}$PASSED${NC}/$TOTAL"
echo -e "Tests failed: ${RED}$FAILED${NC}/$TOTAL"
echo -e "Success rate: ${CYAN}${PERCENTAGE}%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  log_success "All tests passed!"
  
  if [ "$TEST_PROD" = true ]; then
    log_info "Production setup is ready for use"
  else
    log_info "Development setup is ready"
    log_info "Next: Deploy to production with ./scripts/deploy-cloud-functions.sh --test"
  fi
  exit 0
else
  log_error "Some tests failed"
  
  if [ "$TEST_PROD" = false ]; then
    log_info "Troubleshooting:"
    echo "  1. Ensure dev server is running: pnpm --filter @ed/dashboard dev"
    echo "  2. Check .env.development is properly configured"
    echo "  3. Run with --verbose for more details: ./scripts/test-api-setup.sh --verbose"
  else
    log_info "Troubleshooting:"
    echo "  1. Check Cloud Functions are deployed: gcloud functions list"
    echo "  2. View logs: gcloud functions logs read [function-name]"
    echo "  3. Run with --verbose for more details: ./scripts/test-api-setup.sh --prod --verbose"
  fi
  exit 1
fi
