#!/usr/bin/env bash
# Secret scanner shared by the pre-commit hook, the pre-push hook and CI.
#   scripts/secret-scan.sh --staged          added lines in the staged diff
#   scripts/secret-scan.sh --range A..B      added lines in a commit range
#   scripts/secret-scan.sh --tree            every tracked file (full audit)
# Never prints a matched value, only file, line number and rule.
set -u

PATTERNS=(
  'AIza[0-9A-Za-z_-]{35}'                          # Google / Firebase API key
  'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}'              # AWS
  'gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}'
  'xox[baprs]-[0-9A-Za-z-]{10,}'                   # Slack
  'sk-(ant-)?[A-Za-z0-9_-]{32,}'                   # OpenAI / Anthropic style
  'sb_secret_[A-Za-z0-9_-]{20,}'                   # Supabase secret key
  'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'  # JWT
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)
# Env-style assignment of a secret-looking name to a real-looking value.
ENV_NAME='^[+ ]?(export )?[A-Za-z0-9_]*(API_?KEY|SECRET|TOKEN|PASSWORD|PRIVATE_?KEY|CLIENT_?SECRET)[A-Za-z0-9_]*='
PLACEHOLDER='=(["'\'']?)(|your[-_a-z0-9]*|<[^>]*>|changeme|xxx+|\$\{[^}]*\}|placeholder[-_a-z0-9]*|demo-key|sb_publishable_[A-Za-z0-9_-]+)\1$'
ENV_FILE='(^|/)\.env([._-][A-Za-z0-9._-]+)?$'
EXAMPLE_FILE='\.(example|sample|template)$'

mode="${1:---staged}"; arg="${2:-}"
case "$mode" in
  --staged) diff_cmd=(git diff --cached -U0 --no-color --diff-filter=ACMR) ;;
  --range)  diff_cmd=(git diff -U0 --no-color --diff-filter=ACMR "$arg") ;;
  --tree)   diff_cmd=() ;;
  *) echo "usage: $0 --staged | --range A..B | --tree" >&2; exit 2 ;;
esac

fail=0
report() { echo "  ❌ $1:$2  $3"; fail=1; }

scan_stream() {   # stdin: "file<TAB>line<TAB>text"
  local file line text p
  while IFS=$'\t' read -r file line text; do
    [[ "$file" =~ $EXAMPLE_FILE ]] && continue
    [[ "$file" == scripts/secret-scan.sh || "$file" == docs/SECRET_HANDLING.md ]] && continue
    [[ "$file" == packages/gcp-functions/scripts/validate-push.js ]] && continue   # contains the scanner's own regexes
    [[ "$text" == *'[your-private-key]'* ]] && continue                            # documentation placeholder
    for p in "${PATTERNS[@]}"; do
      if [[ "$text" =~ $p ]]; then report "$file" "$line" "matches secret pattern"; break; fi
    done
    if [[ "$file" =~ $ENV_FILE ]] && [[ "$text" =~ $ENV_NAME ]] && ! [[ "${text#*=}" =~ ^[[:space:]]*$ ]]; then
      local v="=${text#*=}"
      shopt -s nocasematch; [[ "$v" =~ $PLACEHOLDER ]] || report "$file" "$line" "secret-named variable with a real value in an env file"; shopt -u nocasematch
    fi
  done
}

if [ "$mode" = "--tree" ]; then
  scan_stream < <(git ls-files -z | xargs -0 grep -nIH '' 2>/dev/null \
    | awk -F: '{f=$1; l=$2; sub(/^[^:]*:[^:]*:/,""); printf "%s\t%s\t%s\n", f, l, $0}')
else
  scan_stream < <("${diff_cmd[@]}" | awk '
    /^\+\+\+ b\//{f=substr($0,7); next}
    /^@@/{match($0,/\+[0-9]+/); n=substr($0,RSTART+1,RLENGTH-1)-1; next}
    /^\+/ && !/^\+\+\+/{n++; printf "%s\t%d\t%s\n", f, n, substr($0,2)}')
  # A staged/added env file that is not an example must not be tracked at all.
  while read -r f; do
    if [[ "$f" =~ $ENV_FILE ]] && ! [[ "$f" =~ $EXAMPLE_FILE ]] && [[ "$f" != *".development" && "$f" != *".production" ]]; then
      echo "  ❌ $f  env files must not be committed (use .env.example)"; fail=1
    fi
  done < <("${diff_cmd[@]}" --name-only 2>/dev/null)
fi

if [ "$fail" -ne 0 ]; then
  echo "🚫 Possible secret detected. Move it to a git-ignored file (.env.local / .env.development.local)"
  echo "   or a secret store. If it was already pushed, rotate it. See docs/SECRET_HANDLING.md."
  exit 1
fi
echo "✅ secret-scan ($mode) clean"
