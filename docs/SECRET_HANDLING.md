# Secret Handling (humans and AI agents)

Incident 2026-11-24: a Google/Firebase `AIza…` key was committed in
`apps/dashboard/.env.development`, pushed to the public repo, flagged by Google
Cloud, and used for Gemini calls. The old commit-time check did not recognise
Google keys, and the pre-push rule could be skipped. This file is the rule set
that replaces "be careful".

## Rules (apply to everyone, including AI agents)

1. **No real values in tracked files.** Tracked env files (`.env.development`,
   `.env.production`, `*.example`) hold only non-secret config, placeholders, or
   blank assignments. Real values go in git-ignored files (`.env`,
   `.env.local`, `.env.development.local`) or the secret store / CI secrets.
2. **"Public by design" is not an exemption.** Firebase web keys, Supabase
   publishable keys and similar are safe to ship in a browser bundle, but they
   still do not go in git: scanners (Google, GitHub) flag them and anyone can
   abuse an unrestricted one. Restrict them in the provider console.
3. **Never create or edit a tracked env file with a real value, even to "fix dev
   auth".** Put the value in `.env.development.local` and leave a comment.
4. **Never print secrets.** Show fingerprints (`sha256sum | cut -c1-8`) or a
   4-character prefix, never the value, in chat, logs, commit messages or docs.
5. **Never bypass the hooks** (`--no-verify`, `HUSKY=0`, editing the scanner's
   allowlist to make a commit pass). If the scanner blocks a commit, fix the
   file. If it is a false positive, change the scanner in a reviewed commit.
6. **If a secret is ever pushed, treat it as public forever.** Rotate or delete
   it in the provider console first; removing it from the tree or history is
   secondary. Do not force-push public history to "hide" it.
7. **A leak response is: rotate → update CI secret and local env → redeploy →
   delete old key → verify old key is dead → document.**

## Agent checklist before committing

- [ ] `git diff --cached` contains no value that looks like a key, token,
      password, private key, or JWT.
- [ ] No `.env*` file is staged except `*.example`, and tracked
      `.env.development` / `.env.production` contain no secret-named variable
      with a value.
- [ ] `scripts/secret-scan.sh --staged` passes (the hook runs it anyway).
- [ ] New secrets needed by CI are added as GitHub secrets, not workflow files.

## Enforcement layers

| Layer | What | Can it be skipped? |
| --- | --- | --- |
| `.husky/pre-commit` | `versioning check-secrets` + `scripts/secret-scan.sh --staged` | yes (`--no-verify`) |
| `.husky/pre-push` | `scripts/secret-scan.sh --tree` + legacy ripgrep rules | yes |
| `.github/workflows/secret-scan.yml` | scans each push/PR range and the full tree | **no** |
| Provider console | key API + referrer restrictions | no |

`scripts/secret-scan.sh` detects Google/Firebase, AWS, GitHub, Slack, OpenAI /
Anthropic-style, Supabase secret keys, JWTs and private keys, plus any
secret-named variable (`*API_KEY`, `*SECRET*`, `*TOKEN*`, `*PASSWORD*`) with a
real value in an env file. It prints file, line and rule, never the value.

Modes: `--staged`, `--range A..B`, `--tree`.

See also [FIREBASE_WEB_API_KEY.md](./FIREBASE_WEB_API_KEY.md).
