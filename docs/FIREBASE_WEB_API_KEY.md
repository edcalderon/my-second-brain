# Firebase Web API Key (`NEXT_PUBLIC_FIREBASE_API_KEY`)

## Is it a secret?

No, but it must still be locked down. A Firebase web key identifies the project to
the browser SDK and is embedded in the built JavaScript, so it cannot be hidden
from users. Its safety comes from **restrictions and server-side rules**, not
from secrecy.

It is still **not committed** to this repo: Google Cloud's secret scanner flags
any `AIza…` string in a public repository, and the pre-push hook blocks it.

## Where the value lives

| Context | Location |
| --- | --- |
| Local development | `apps/dashboard/.env.development.local` (git-ignored) |
| CI / production build | GitHub Actions secret `NEXT_PUBLIC_FIREBASE_API_KEY` |
| Tracked `.env.development` | left blank on purpose |
| Examples | `apps/dashboard/.env.example` (placeholder only) |

## Required key settings (Google Cloud → APIs & Services → Credentials)

- **API restrictions:** only Identity Toolkit API, Token Service API, Cloud
  Firestore API (and Firebase Installations if listed). Do **not** enable
  Generative Language or Vertex AI; the dashboard does not use them.
- **Application restrictions:** HTTP referrers for the deployed dashboard
  domain(s), `https://<project>.firebaseapp.com/*`, and `http://localhost:3000/*`.
- Disable APIs the project does not use (`generativelanguage.googleapis.com`,
  `aiplatform.googleapis.com`).

## Verifying (no secrets printed)

```bash
KEY=...   # the key, from your env
# Gemini must be blocked (expect 403):
curl -s -o /dev/null -w "%{http_code}\n" "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY"
# A foreign referrer must be rejected (expect API_KEY_HTTP_REFERRER_BLOCKED):
curl -s -e https://evil.example.com/ -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=$KEY" \
  -H 'Content-Type: application/json' -d '{"idToken":"x"}'
```

## Rotation

1. Create a new key with the settings above.
2. Update `.env.development.local` and the GitHub secret
   (`gh secret set NEXT_PUBLIC_FIREBASE_API_KEY -R <owner>/<repo>`), then redeploy.
3. Confirm sign-in works, then delete the old key.

## Incident note (2026-11-24)

A key was committed in `apps/dashboard/.env.development` and flagged by Google
Cloud; Gemini usage was seen on it. It was removed from the tree, rotated, and
the Generative Language API restricted. The old key remains in git history and
must stay deleted/disabled in Google Cloud.

## Firestore rules

`firestore.rules` allows public **read** of `knowledge_base` and **denies all
client writes** (changed 2026-11-24; previously any signed-in user could write,
which is meaningless with a public key and open sign-up). Writes go through the
Cloud Functions via the admin SDK, which bypasses rules. Deploy rule changes with
`firebase deploy --only firestore:rules --project second-brain-482901`.

Also keep sign-up closed in Firebase Authentication unless you need it.
