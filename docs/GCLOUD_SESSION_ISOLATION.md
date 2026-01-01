# GCloud Session Isolation Setup

## Quick Start

### Method 1: Source Environment Variables
```bash
# In your terminal session
source /home/ed/Documents/edward/.env.gcloud
```

### Method 2: Use Wrapper Functions
```bash
# Add to ~/.bashrc or ~/.zshrc
source /home/ed/Documents/edward/scripts/gcloud-wrapper.sh

# Use isolated gcloud
gcloud-second-brain auth list
gcloud-second-brain config list

# Start isolated terminal session
start-isolated-gcloud

# List all sessions
list-gcloud-sessions

# Clean up session
cleanup-gcloud-session
```

### Method 3: Automatic with direnv
```bash
# Install direnv if not already installed
# For Ubuntu/Debian: sudo apt install direnv
# For macOS: brew install direnv

# Hook direnv into your shell
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
# or for zsh: echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# Restart shell, then in project directory:
direnv allow
```

## What This Does

- **CLOUDSDK_CONFIG**: Isolates gcloud configuration per session
- **GOOGLE_APPLICATION_CREDENTIALS**: Uses your service account
- **CLOUDSDK_CORE_PROJECT**: Sets project to second-brain-482901
- **CLOUDSDK_CORE_ACCOUNT**: Sets service account email

## Session Isolation Benefits

- Each terminal session has its own gcloud config
- No cross-contamination between projects/accounts
- Service account authentication isolated per session
- Automatic project switching with direnv