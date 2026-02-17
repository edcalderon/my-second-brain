#!/bin/bash

# Check if versioning package version changed and README is updated

VERSIONING_PACKAGE_JSON="packages/versioning/package.json"
README="packages/versioning/README.md"

# Get current version
CURRENT_VERSION=$(grep '"version"' "$VERSIONING_PACKAGE_JSON" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

# Check if README has the current version in "Latest Changes (vX.Y.Z)"
if ! grep -q "Latest Changes (v$CURRENT_VERSION)" "$README"; then
  echo "❌ ERROR: Versioning package version is $CURRENT_VERSION but README.md does not contain 'Latest Changes (v$CURRENT_VERSION)'"
  echo "Please update the README.md with the latest changes for version $CURRENT_VERSION"
  exit 1
fi

echo "✅ Versioning README is up to date for version $CURRENT_VERSION"