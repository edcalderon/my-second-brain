/**
 * Authentik logout orchestrator.
 *
 * A correct Authentik logout requires all of these steps in sequence:
 * 1. Clear app-local session state
 * 2. Revoke the access token (best-effort)
 * 3. Build the RP-initiated logout URL with id_token_hint
 * 4. Navigate the browser to the end-session URL
 *
 * Reference: CIG apps/landing/components/AuthProvider.tsx signOut()
 */

import type { AuthentikLogoutConfig, AuthentikLogoutResult } from "./types";

/* ------------------------------------------------------------------ */
/*  URL helpers                                                        */
/* ------------------------------------------------------------------ */

function ensureTrailingSlash(path: string): string {
    return path.endsWith("/") ? path : `${path}/`;
}

function resolveEndpoint(
    issuer: string,
    explicitPath: string | undefined,
    fallbackSuffix: string,
): string {
    const issuerUrl = new URL(issuer);
    if (explicitPath) {
        return new URL(explicitPath, `${issuerUrl.origin}/`).toString();
    }
    const base = ensureTrailingSlash(issuerUrl.pathname);
    return new URL(`${base}${fallbackSuffix}`, issuerUrl.origin).toString();
}

/* ------------------------------------------------------------------ */
/*  Token revocation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Revoke an OAuth2 token at the Authentik revocation endpoint.
 *
 * This is a **best-effort** operation — revocation failures do not
 * prevent logout from completing. Returns `true` if the server
 * responded with 2xx.
 */
export async function revokeToken(
    config: AuthentikLogoutConfig,
    accessToken: string,
): Promise<boolean> {
    const revocationUrl = resolveEndpoint(
        config.issuer,
        config.revocationPath,
        "revoke/",
    );
    const fetchFn = config.fetchFn || fetch;

    const body = new URLSearchParams({
        token: accessToken,
        token_type_hint: "access_token",
    });

    if (config.clientId) {
        body.set("client_id", config.clientId);
    }

    try {
        const response = await fetchFn(revocationUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        return response.ok;
    } catch {
        // Revocation is best-effort
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  RP-initiated logout URL                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the Authentik RP-initiated logout URL.
 *
 * The resulting URL, when navigated to, will:
 * 1. Clear the Authentik browser session
 * 2. Redirect back to `postLogoutRedirectUri`
 *
 * Requires that the Authentik provider has an **invalidation flow**
 * configured with a "User Logout" stage and a redirect stage.
 */
export function buildEndSessionUrl(
    config: AuthentikLogoutConfig,
    idToken?: string,
): string {
    const endSessionUrl = resolveEndpoint(
        config.issuer,
        config.endSessionPath,
        "end-session/",
    );
    const url = new URL(endSessionUrl);

    if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
    }

    url.searchParams.set(
        "post_logout_redirect_uri",
        config.postLogoutRedirectUri,
    );

    return url.toString();
}

/* ------------------------------------------------------------------ */
/*  Full logout orchestration                                          */
/* ------------------------------------------------------------------ */

/**
 * Execute the full Authentik logout sequence:
 *
 * 1. Revoke the access token (best-effort)
 * 2. Build the RP-initiated end-session URL
 *
 * The caller is responsible for:
 * - Clearing app-local session state **before** calling this function
 * - Navigating the browser to `result.endSessionUrl` **after** this returns
 *
 * This design keeps the orchestrator framework-agnostic.
 */
export async function orchestrateLogout(
    config: AuthentikLogoutConfig,
    tokens: { accessToken?: string; idToken?: string },
): Promise<AuthentikLogoutResult> {
    let tokenRevoked = false;

    if (tokens.accessToken) {
        tokenRevoked = await revokeToken(config, tokens.accessToken);
    }

    const endSessionUrl = buildEndSessionUrl(config, tokens.idToken);

    return { endSessionUrl, tokenRevoked };
}
