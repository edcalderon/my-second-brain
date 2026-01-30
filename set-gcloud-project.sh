#!/bin/bash
#!/bin/bash
# Source this file to set the correct gcloud project context
# Usage: source ./set-gcloud-project.sh

set -euo pipefail

ENV_FILE="./.env.gcloud"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
else
  echo "⚠️  $ENV_FILE not found. Create it or copy from .env.gcloud template."
  return 1
fi

echo "✓ Switched to gcloud project: ${CLOUDSDK_CORE_PROJECT:-<unset>}"
echo "✓ Account: ${CLOUDSDK_CORE_ACCOUNT:-<unset>}"
echo "✓ Credentials: ${GOOGLE_APPLICATION_CREDENTIALS:-<unset>}"
echo ""
echo "Current project: $(gcloud config get-value project 2>/dev/null)"
