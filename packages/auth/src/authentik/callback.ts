/**
 * Enhanced Authentik callback handler with blocking provisioning support.
 *
 * This module handles the OIDC authorization code exchange and optionally
 * calls a provisioning adapter **before** allowing the app to redirect
 * into the protected product.
 *
 * Reference: CIG apps/dashboard/app/auth/callback/page.tsx
 */

import type {
    AuthentikCallbackConfig,
    AuthentikCallbackResult,
    AuthentikTokenResponse,
    AuthentikClaims,
    ProvisioningAdapter,
    ProvisioningPayload,
    ProvisioningResult,
} from "./types";

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
/*  Token exchange                                                     */
/* ------------------------------------------------------------------ */

/**
 * Exchange an authorization code for tokens using PKCE.
 *
 * This is a pure server-safe function — it does not touch sessionStorage.
 */
export async function exchangeCode(
    config: AuthentikCallbackConfig,
    code: string,
    codeVerifier: string,
): Promise<AuthentikTokenResponse> {
    const tokenUrl = resolveEndpoint(config.issuer, config.tokenPath, "token/");
    const fetchFn = config.fetchFn || fetch;

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        code_verifier: codeVerifier,
    });

    const response = await fetchFn(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!response.ok) {
        throw new Error(
            `NETWORK_ERROR: Token exchange failed (HTTP ${response.status})`,
        );
    }

    const json = (await response.json()) as Record<string, unknown>;

    if (!json.access_token || typeof json.access_token !== "string") {
        throw new Error("SESSION_ERROR: Token response missing access_token");
    }

    return {
        access_token: json.access_token as string,
        token_type: (json.token_type as string) ?? undefined,
        refresh_token: (json.refresh_token as string) ?? undefined,
        id_token: (json.id_token as string) ?? undefined,
        expires_in: typeof json.expires_in === "number" ? json.expires_in : undefined,
        scope: (json.scope as string) ?? undefined,
    };
}

/* ------------------------------------------------------------------ */
/*  Userinfo                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fetch OIDC claims from the Authentik userinfo endpoint.
 */
export async function fetchClaims(
    config: AuthentikCallbackConfig,
    accessToken: string,
): Promise<AuthentikClaims> {
    const userinfoUrl = resolveEndpoint(
        config.issuer,
        config.userinfoPath,
        "userinfo/",
    );
    const fetchFn = config.fetchFn || fetch;

    const response = await fetchFn(userinfoUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error(
            `NETWORK_ERROR: Userinfo request failed (HTTP ${response.status})`,
        );
    }

    const claims = (await response.json()) as AuthentikClaims;

    if (!claims.sub || !claims.iss) {
        throw new Error(
            "SESSION_ERROR: Userinfo response missing required claims (sub, iss)",
        );
    }

    return claims;
}

/* ------------------------------------------------------------------ */
/*  Full callback flow                                                 */
/* ------------------------------------------------------------------ */

/**
 * Options for the full callback handler.
 */
export interface ProcessCallbackOptions {
    /** Callback config (issuer, clientId, redirectUri, etc.). */
    config: AuthentikCallbackConfig;
    /** The authorization code from the callback query string. */
    code: string;
    /** The PKCE code verifier stored by the relay or startOAuthFlow. */
    codeVerifier: string;
    /** The state token from the callback query string. */
    state: string;
    /** The expected state token (from sessionStorage / relay). */
    expectedState: string;
    /** The social-login provider that initiated the flow. */
    provider: string;
    /**
     * Optional provisioning adapter.
     * When provided the callback will **block** until provisioning succeeds.
     * If provisioning fails the result will contain the error.
     */
    provisioningAdapter?: ProvisioningAdapter;
}

/**
 * Result of the full callback flow.
 */
export interface ProcessCallbackResult {
    /** Whether the entire flow (exchange + provisioning) succeeded. */
    success: boolean;
    /** Tokens + claims from the exchange step. */
    callbackResult?: AuthentikCallbackResult;
    /** Provisioning result (only present when an adapter was provided). */
    provisioningResult?: ProvisioningResult;
    /** Error message on failure. */
    error?: string;
    /** Machine-readable error code on failure. */
    errorCode?: string;
}

/**
 * Process an Authentik OIDC callback end-to-end:
 *
 * 1. Validate state matches
 * 2. Exchange the authorization code for tokens
 * 3. Fetch OIDC claims from userinfo
 * 4. (Optional) Run the provisioning adapter — blocks until complete
 * 5. Return the combined result
 *
 * If any step fails the function returns `{ success: false, error }`.
 * It does **not** throw so that callers can present structured error UI.
 */
export async function processCallback(
    options: ProcessCallbackOptions,
): Promise<ProcessCallbackResult> {
    // 1. State validation
    if (options.state !== options.expectedState) {
        return {
            success: false,
            error: "Invalid callback state — possible CSRF or expired session",
            errorCode: "state_mismatch",
        };
    }

    // 2. Token exchange
    let tokens: AuthentikTokenResponse;
    try {
        tokens = await exchangeCode(options.config, options.code, options.codeVerifier);
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Token exchange failed",
            errorCode: "token_exchange_failed",
        };
    }

    // 3. Fetch claims
    let claims: AuthentikClaims;
    try {
        claims = await fetchClaims(options.config, tokens.access_token);
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Userinfo fetch failed",
            errorCode: "userinfo_failed",
        };
    }

    const callbackResult: AuthentikCallbackResult = {
        tokens,
        claims,
        provider: options.provider,
    };

    // 4. Provisioning gate
    if (options.provisioningAdapter) {
        const payload: ProvisioningPayload = {
            sub: claims.sub,
            iss: claims.iss,
            email: (claims.email || "").toLowerCase(),
            emailVerified: claims.email_verified,
            name: claims.name || claims.preferred_username,
            picture: claims.picture,
            provider: options.provider,
            rawClaims: claims as Record<string, unknown>,
        };

        let provisioningResult: ProvisioningResult;
        try {
            provisioningResult = await options.provisioningAdapter.sync(payload);
        } catch (err) {
            return {
                success: false,
                callbackResult,
                error: err instanceof Error ? err.message : "Provisioning failed",
                errorCode: "provisioning_error",
            };
        }

        if (!provisioningResult.synced) {
            return {
                success: false,
                callbackResult,
                provisioningResult,
                error:
                    provisioningResult.error || "User provisioning did not complete",
                errorCode: provisioningResult.errorCode || "provisioning_failed",
            };
        }

        return {
            success: true,
            callbackResult,
            provisioningResult,
        };
    }

    // No adapter — exchange-only mode
    return { success: true, callbackResult };
}
