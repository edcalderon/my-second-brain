#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
A_QUANT_DIR="${A_QUANT_DIR:-$ROOT_DIR/../a-quant}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
A_QUANT_PORT="${A_QUANT_PORT:-8001}"
API_SVC_DIR="$A_QUANT_DIR/apps/api-svc"
VENV_DIR="${A_QUANT_VENV_DIR:-$API_SVC_DIR/.venv}"
VENV_PYTHON="$VENV_DIR/bin/python"
REQ_FILE="$API_SVC_DIR/requirements.txt"
REQ_STAMP="$VENV_DIR/.requirements.sha256"

if [ ! -d "$API_SVC_DIR" ]; then
    echo "A-Quant repo not found at: $A_QUANT_DIR"
    echo "Set A_QUANT_DIR to the sibling repo root before running this script."
    exit 1
fi

ensure_a_quant_python_env() {
    local req_hash
    if command -v sha256sum >/dev/null 2>&1; then
        req_hash="$(sha256sum "$REQ_FILE" | awk '{print $1}')"
    elif command -v shasum >/dev/null 2>&1; then
        req_hash="$(shasum -a 256 "$REQ_FILE" | awk '{print $1}')"
    else
        echo "Neither sha256sum nor shasum is available to fingerprint $REQ_FILE"
        exit 1
    fi

    if [ -x "$VENV_PYTHON" ] && [ -f "$REQ_STAMP" ] && [ "$(cat "$REQ_STAMP")" = "$req_hash" ] && "$VENV_PYTHON" -c "import uvicorn" >/dev/null 2>&1; then
        return 0
    fi

    if [ ! -x "$VENV_PYTHON" ]; then
        echo "[aquant] Creating Python virtualenv at $VENV_DIR"
        python3 -m venv "$VENV_DIR"
    fi

    echo "[aquant] Installing api-svc requirements"
    "$VENV_PYTHON" -m pip install -r "$REQ_FILE"
    printf '%s\n' "$req_hash" > "$REQ_STAMP"
}

ensure_a_quant_python_env

export NEXT_PUBLIC_DASHBOARD_API_BASE="${NEXT_PUBLIC_DASHBOARD_API_BASE:-http://localhost:$DASHBOARD_PORT}"
export NEXT_PUBLIC_A_QUANT_API_BASE="${NEXT_PUBLIC_A_QUANT_API_BASE:-http://localhost:$A_QUANT_PORT}"
export NEXT_PUBLIC_HUMMINGBOT_API_BASE="${NEXT_PUBLIC_HUMMINGBOT_API_BASE:-http://localhost:$A_QUANT_PORT}"

exec concurrently -k -n dashboard,aquant -c cyan,magenta \
    "pnpm --filter @ed/dashboard dev -p $DASHBOARD_PORT" \
    "cd '$API_SVC_DIR' && '$VENV_PYTHON' -m uvicorn src.main:app --host 0.0.0.0 --port $A_QUANT_PORT --reload"
