# Docs Secret Safety Policy

## Purpose
Prevent credential leaks in Markdown and operational docs.

## Hard Rules
- Never write real secrets in `.md` files.
- Never include real values for keys ending in `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `PRIVATE_KEY`, or `CLIENT_SECRET`.
- Never include real `Authorization: Bearer ...` headers or private key blocks.
- Avoid personal/private identifiers in docs unless operationally required (personal email addresses, account IDs, direct phone numbers).
- If a document needs configuration examples, use placeholders only.

## Required Placeholder Formats
Use one of these safe forms:
- `[REDACTED]`
- `[REDACTED - ROTATED]`
- `[USER_EMAIL]`
- `[YOUR_IMAP_PASSWORD]`
- `[YOUR_SMTP_PASSWORD]`
- `YOUR_API_KEY_HERE`
- `<client-secret>`

## Allowed Documentation Pattern
```txt
IMAP_PASSWORD: [YOUR_IMAP_PASSWORD]
SMTP_PASSWORD: [YOUR_SMTP_PASSWORD]
```

## Commit Guard
The pre-commit hook runs:
- `npx versioning check-secrets`

This blocks markdown credential assignments when a secret key is paired with a non-placeholder literal value.

## Agent Authoring Rules
- If an agent must show a command with secret fields, it must use placeholders.
- If an agent reads logs that contain credentials, it must redact values before writing docs.
- If unsure whether a value is sensitive, redact it.

## Incident Follow-up Checklist
- Rotate exposed secret immediately.
- Invalidate sessions or tokens tied to that secret.
- Review access logs for unauthorized use.
- Remove leaked value from git history when needed.
- Record the incident and remediation in a postmortem doc.
