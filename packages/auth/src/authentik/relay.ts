/**
 * Cross-origin PKCE relay handler for Authentik social login.
 *
 * When the login UI lives on a different origin than the callback handler,
 * sessionStorage is origin-scoped. The relay stores the PKCE verifier and
 * state on the callback origin before navigating to Authentik.
 *
 * Reference: CIG apps/dashboard/app/auth/login/[provider]/route.ts
 */

import type {
    AuthentikRelayConfig,
    RelayIncomingParams,
    RelayHandlerResult,
} from "./types";

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_STORAGE_KEY_PREFIX = "authentik_relay";

/**
 * Resolve the Authentik flow URL for a provider.
 *
 * If `providerFlowSlugs` maps the provider to a custom flow, the URL is:
 *   `{issuerOrigin}/if/flow/{flowSlug}/?next={authorizeUrl}`
 *
 * Otherwise falls back to the Authentik source-based social login:
 *   `{issuerOrigin}/source/oauth/login/{provider}/?next={authorizeUrl}`
 */
function buildFlowUrl(
    config: AuthentikRelayConfig,
    provider: string,
    authorizeUrl: string,
): string {
    const issuerOrigin = new URL(config.issuer).origin;
    const flowSlug = config.providerFlowSlugs?.[provider];

    if (flowSlug) {
        const url = new URL(`/if/flow/${encodeURIComponent(flowSlug)}/`, issuerOrigin);
        url.searchParams.set("next", authorizeUrl);
        return url.toString();
    }

    const url = new URL(
        `/source/oauth/login/${encodeURIComponent(provider)}/`,
        issuerOrigin,
    );
    url.searchParams.set("next", authorizeUrl);
    return url.toString();
}

/**
 * Build the OIDC authorize URL that Authentik will redirect to after the
 * social-provider flow completes.
 */
function buildAuthorizeUrl(
    config: AuthentikRelayConfig,
    params: RelayIncomingParams,
): string {
    const issuerBase = config.issuer.endsWith("/")
        ? config.issuer
        : `${config.issuer}/`;
    const url = new URL("authorize/", issuerBase);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", config.scope || DEFAULT_SCOPE);
    url.searchParams.set("state", params.state);
    url.searchParams.set("code_challenge", params.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return url.toString();
}

/**
 * Generate the minimal HTML page that the relay route should serve.
 *
 * This page:
 * 1. Stores PKCE params in the callback origin's sessionStorage
 * 2. Redirects the browser to the Authentik social login flow
 *
 * The HTML is self-contained and does **not** load any external scripts.
 */
export function createRelayPageHtml(
    config: AuthentikRelayConfig,
    params: RelayIncomingParams,
): RelayHandlerResult {
    const authorizeUrl = buildAuthorizeUrl(config, params);
    const flowUrl = buildFlowUrl(config, params.provider, authorizeUrl);
    const prefix = config.storageKeyPrefix || DEFAULT_STORAGE_KEY_PREFIX;

    // Escape for safe embedding in a <script> block
    const safeJson = (v: unknown): string =>
        JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

    const html = [
        "<!DOCTYPE html>",
        "<html><head><meta charset=\"utf-8\"><title>Redirecting…</title></head>",
        "<body>",
        "<p>Redirecting to login…</p>",
        "<script>",
        "(function(){",
        `  try{`,
        `    var s=window.sessionStorage;`,
        `    s.setItem(${safeJson(`${prefix}:verifier`)},${safeJson(params.codeVerifier)});`,
        `    s.setItem(${safeJson(`${prefix}:state`)},${safeJson(params.state)});`,
        `    s.setItem(${safeJson(`${prefix}:provider`)},${safeJson(params.provider)});`,
        params.next
            ? `    s.setItem(${safeJson(`${prefix}:next`)},${safeJson(params.next)});`
            : "",
        `  }catch(e){console.error("relay storage error",e);}`,
        `  window.location.replace(${safeJson(flowUrl)});`,
        "})();",
        "</script>",
        "</body></html>",
    ]
        .filter(Boolean)
        .join("\n");

    return { html };
}

/**
 * Parse the query parameters that the login origin sends to the relay.
 *
 * Expected query params:
 *   - `code_verifier`  — PKCE verifier generated on the login origin
 *   - `code_challenge` — PKCE challenge (SHA-256 of verifier, base64url)
 *   - `state`          — CSRF state token
 *   - `next`           — (optional) post-login redirect target
 *
 * Returns `null` if required params are missing.
 */
export function parseRelayParams(
    searchParams: URLSearchParams | Record<string, string | undefined>,
): RelayIncomingParams | null {
    const get = (key: string): string | undefined => {
        if (searchParams instanceof URLSearchParams) {
            return searchParams.get(key) ?? undefined;
        }
        return searchParams[key];
    };

    const codeVerifier = get("code_verifier");
    const codeChallenge = get("code_challenge");
    const state = get("state");
    const provider = get("provider");

    if (!codeVerifier || !codeChallenge || !state || !provider) {
        return null;
    }

    return {
        provider,
        codeVerifier,
        codeChallenge,
        state,
        next: get("next"),
    };
}

/**
 * Read PKCE params back from sessionStorage on the callback origin.
 *
 * This is called by the callback handler after Authentik redirects back
 * with `?code=&state=`.
 */
export function readRelayStorage(
    storage: Storage,
    prefix: string = DEFAULT_STORAGE_KEY_PREFIX,
): { codeVerifier: string; state: string; provider: string; next?: string } | null {
    const codeVerifier = storage.getItem(`${prefix}:verifier`);
    const state = storage.getItem(`${prefix}:state`);
    const provider = storage.getItem(`${prefix}:provider`);

    if (!codeVerifier || !state || !provider) {
        return null;
    }

    const next = storage.getItem(`${prefix}:next`) ?? undefined;
    return { codeVerifier, state, provider, next };
}

/**
 * Clean up relay storage after a successful callback exchange.
 */
export function clearRelayStorage(
    storage: Storage,
    prefix: string = DEFAULT_STORAGE_KEY_PREFIX,
): void {
    storage.removeItem(`${prefix}:verifier`);
    storage.removeItem(`${prefix}:state`);
    storage.removeItem(`${prefix}:provider`);
    storage.removeItem(`${prefix}:next`);
}
