# Dashboard Frontend Architecture (Static Export & Hybrid API Flow)

## **1. The Challenge (Next.js on GitHub Pages)**
The Edward Dashboard uses `output: "export"` strictly in `next.config.mjs` to compile the entire front-end application down to static HTML, Javascript, and CSS files. This configuration allows it to be efficiently hosted on static services like GitHub Pages.

**The catch:** Next.js Server-side routes (e.g., `/api/status`, `/api/knowledge`) absolutely **cannot** be rendered dynamically at runtime on static site hosts, leading to bailout errors if not configured properly.

---

## **2. The Solution: Environment-Aware Routing**
We built a decoupled, environment-first API router (`src/lib/api-config.ts`) that strictly evaluates the current build target.

*   **Local UI Development (`pnpm dev`)**
    When run locally, the API router actively targets internal Next.js endpoints (e.g., `http://localhost:3000/api/status`). The `/src/app/api/...` folder kicks into gear, querying Firebase/Supabase directly in the Node.js context and serving local results natively. This ensures instant feedback cycles.
*   **Production Deployment (`GitHub Pages`)**
    When exported and shipped, the built-in Next.js `/api/` folder is intentionally abandoned. The API router pivots entirely, intercepting traffic to those paths and re-routing the `fetch()` calls to remote micro-services such as:
    *   **GCP Cloud Functions** (`https://us-central1-second-brain-XXXX.cloudfunctions.net`)
    *   **External FastAPI Engines** (A-Quant)

---

## **3. Firebase-First Auth Flow**
The dashboard now uses Firebase as the browser auth source of truth and keeps Supabase as a separate data client.

1.  **Orchestrator Level (`@ed/auth`)**: The Dashboard loads `FirebaseWebClient` when Firebase env vars are present.
2.  **Firebase Popup UI**: Users sign in via Google OAuth utilizing Firebase's secure popup interface.
3.  **Session Token**: The browser session is managed by Firebase Auth, and `getSessionToken()` returns a Firebase ID token when the app needs to call external APIs.
4.  **API Distribution**: When the `dashboard-api.ts` or `hummingbot-api.ts` modules construct a `fetchWithAuth()` call, they inject the available bearer token into `Authorization` headers.
    - If no token is available, the request is still sent without auth headers.
    - Supabase is used only for dashboard data access and realtime subscriptions, not for the browser login exchange.

### Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Firebase
    participant Supabase
    participant CloudFunction

    User->>Browser: Clicks "Sign in with Google"
    Browser->>Firebase: Trigger signInWithPopup()
    Firebase-->>Browser: Returns credential and Firebase ID token
    Browser-->>Browser: Stores Firebase session locally

    User->>Browser: Requests Trading Data
    Browser->>Browser: Extract Firebase ID token locally
    Browser->>CloudFunction: `fetch(API_URL, Bearer {access_token})`
    CloudFunction->>Supabase: Validate JWT token
    CloudFunction-->>Browser: Deliver Protected Payload
```

---

## **4. Developer Checklist for Release**
When modifying API routes, a developer must ensure:
1.  **Local Node Route**: Implement logic inside `src/app/api/your-route/route.ts` with `export const dynamic = 'force-static'` for Next.JS build compatibility.
2.  **Cloud Function Parity**: Build identical robust endpoint logic within `packages/gcp-functions`.
3.  **Router Registry**: Map the new destination securely into the `cloudFunctionMap` config constant found in `src/lib/api-config.ts`.
