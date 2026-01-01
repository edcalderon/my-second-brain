# GCloud Session Isolation

This guide shows how to isolate gcloud account switching per terminal session instead of affecting system-wide settings.

## Problem

When you run `gcloud config set account`, it changes the active account system-wide, affecting all terminals and scripts.

## Solution Overview

Use environment variables to isolate gcloud sessions:

- **CLOUDSDK_CONFIG**: Separate config directory per session
- **GOOGLE_APPLICATION_CREDENTIALS**: Service account key path
- **CLOUDSDK_CORE_PROJECT**: Default project ID
- **CLOUDSDK_CORE_ACCOUNT**: Service account email

## Setup Methods

### Method 1: Source Environment Variables

Quick isolation for current session:

```bash
source /home/ed/Documents/edward/.env.gcloud
```

### Method 2: Wrapper Functions (Recommended)

Add to `~/.bashrc` or `~/.zshrc`:

```bash
source /home/ed/Documents/edward/scripts/gcloud-wrapper.sh
```

Available functions:
- `gcloud-second-brain` - Run gcloud with isolated config
- `start-isolated-gcloud` - Start new shell with isolated environment
- `list-gcloud-sessions` - Show available sessions
- `cleanup-gcloud-session` - Remove session directory

### Method 3: Automatic with direnv

Install direnv and add to shell:
```bash
eval "$(direnv hook bash)"  # or zsh
```

In project directory:
```bash
direnv allow
```

## Files Created

- `.env.gcloud` - Environment variables
- `scripts/gcloud-wrapper.sh` - Bash functions
- `.envrc` - direnv configuration
- `config/private.json` - Service account credentials

## Service Account Details

- **Project**: second-brain-482901
- **Account**: admin-second-brain@second-brain-482901.iam.gserviceaccount.com
- **Region**: us-central1
- **Zone**: us-central1-a

## Usage Examples

```bash
# Start isolated session
source /home/ed/Documents/edward/.env.gcloud

# Check isolated configuration
gcloud config list
gcloud auth list

# Run commands safely
gcloud functions deploy my-function
gcloud storage buckets list
```

## Benefits

- ✅ Each terminal has isolated gcloud config
- ✅ No cross-contamination between sessions
- ✅ Service account authentication per session
- ✅ Automatic project switching with direnv
- ✅ Safe for parallel development work