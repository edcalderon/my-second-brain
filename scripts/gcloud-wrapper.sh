#!/bin/bash

gcloud-second-brain() {
    local session_dir="$HOME/.gcloud-second-brain"
    
    mkdir -p "$session_dir"
    
    export CLOUDSDK_CONFIG="$session_dir"
    export GOOGLE_APPLICATION_CREDENTIALS="/home/ed/Documents/edward/config/private.json"
    export CLOUDSDK_CORE_PROJECT="second-brain-482901"
    export CLOUDSDK_CORE_ACCOUNT="admin-second-brain@second-brain-482901.iam.gserviceaccount.com"
    export CLOUDSDK_COMPUTE_REGION="us-central1"
    export CLOUDSDK_COMPUTE_ZONE="us-central1-a"
    
    echo "🔧 GCloud isolated session: second-brain"
    echo "Config: $CLOUDSDK_CONFIG"
    echo "Project: $CLOUDSDK_CORE_PROJECT"
    
    gcloud "$@"
}

start-isolated-gcloud() {
    local session_name=${1:-"second-brain"}
    local session_dir="$HOME/.gcloud-$session_name"
    
    mkdir -p "$session_dir"
    
    echo "🚀 Starting isolated GCloud session: $session_name"
    echo "Config directory: $session_dir"
    
    CLOUDSDK_CONFIG="$session_dir" \
    GOOGLE_APPLICATION_CREDENTIALS="/home/ed/Documents/edward/config/private.json" \
    CLOUDSDK_CORE_PROJECT="second-brain-482901" \
    CLOUDSDK_CORE_ACCOUNT="admin-second-brain@second-brain-482901.iam.gserviceaccount.com" \
    CLOUDSDK_COMPUTE_REGION="us-central1" \
    CLOUDSDK_COMPUTE_ZONE="us-central1-a" \
    $SHELL
}

list-gcloud-sessions() {
    echo "📋 Available GCloud sessions:"
    ls -la "$HOME"/.gcloud-* 2>/dev/null | grep -E '\.gcloud-' | awk '{print $9}' | xargs -I {} basename {} | while read session; do
        echo "  - $session"
    done
}

cleanup-gcloud-session() {
    local session_name=${1:-"second-brain"}
    local session_dir="$HOME/.gcloud-$session_name"
    
    if [ -d "$session_dir" ]; then
        echo "🧹 Cleaning up session: $session_name"
        rm -rf "$session_dir"
        echo "✅ Session cleaned up"
    else
        echo "❌ Session not found: $session_name"
    fi
}