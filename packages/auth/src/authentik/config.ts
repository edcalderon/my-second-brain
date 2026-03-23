/**
 * Configuration validation / doctor helpers.
 *
 * These helpers detect missing or invalid configuration **before** the
 * first real user login, so misconfigured environments fail fast.
 *
 * Reference: CIG `supabase_not_configured` callback error code.
 */

import type {
    ConfigValidationResult,
    ConfigCheck,
    AuthentikCallbackConfig,
    AuthentikEndpoints,
    SupabaseSyncConfig,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Authentik config validation                                        */
/* ------------------------------------------------------------------ */

/**
 * Validate that the core Authentik OIDC configuration is present and
 * syntactically correct.
 *
 * This does **not** make network requests — it only checks that the
 * required values are set and look reasonable.
 */
export function validateAuthentikConfig(
    config: Partial<AuthentikCallbackConfig>,
): ConfigValidationResult {
    const checks: ConfigCheck[] = [];

    // issuer
    checks.push(
        config.issuer
            ? isValidUrl(config.issuer)
                ? { name: "issuer", passed: true, message: "Issuer URL is valid", severity: "error" }
                : { name: "issuer", passed: false, message: `Issuer is not a valid URL: ${config.issuer}`, severity: "error" }
            : { name: "issuer", passed: false, message: "Authentik issuer URL is required", severity: "error" },
    );

    // clientId
    checks.push(
        config.clientId
            ? { name: "clientId", passed: true, message: "Client ID is set", severity: "error" }
            : { name: "clientId", passed: false, message: "Authentik client_id is required", severity: "error" },
    );

    // redirectUri
    checks.push(
        config.redirectUri
            ? isValidUrl(config.redirectUri)
                ? { name: "redirectUri", passed: true, message: "Redirect URI is valid", severity: "error" }
                : { name: "redirectUri", passed: false, message: `Redirect URI is not a valid URL: ${config.redirectUri}`, severity: "error" }
            : { name: "redirectUri", passed: false, message: "Redirect URI is required", severity: "error" },
    );

    // tokenEndpoint
    checks.push(
        config.tokenEndpoint
            ? isValidUrl(config.tokenEndpoint)
                ? { name: "tokenEndpoint", passed: true, message: "Token endpoint URL is valid", severity: "error" }
                : { name: "tokenEndpoint", passed: false, message: `Token endpoint is not a valid URL: ${config.tokenEndpoint}`, severity: "error" }
            : { name: "tokenEndpoint", passed: false, message: "Token endpoint URL is required — use discoverEndpoints() or supply manually", severity: "error" },
    );

    // userinfoEndpoint
    checks.push(
        config.userinfoEndpoint
            ? isValidUrl(config.userinfoEndpoint)
                ? { name: "userinfoEndpoint", passed: true, message: "Userinfo endpoint URL is valid", severity: "error" }
                : { name: "userinfoEndpoint", passed: false, message: `Userinfo endpoint is not a valid URL: ${config.userinfoEndpoint}`, severity: "error" }
            : { name: "userinfoEndpoint", passed: false, message: "Userinfo endpoint URL is required — use discoverEndpoints() or supply manually", severity: "error" },
    );

    return {
        valid: checks.every((c) => c.passed),
        checks,
    };
}

/* ------------------------------------------------------------------ */
/*  Supabase sync config validation                                    */
/* ------------------------------------------------------------------ */

/**
 * Validate the server-side Supabase sync configuration.
 *
 * Returns a diagnostic result with the exact error code
 * `supabase_not_configured` when the Supabase URL or service role key
 * is missing, matching the CIG convention.
 */
export function validateSupabaseSyncConfig(
    config: Partial<SupabaseSyncConfig>,
): ConfigValidationResult {
    const checks: ConfigCheck[] = [];

    // supabaseUrl
    checks.push(
        config.supabaseUrl
            ? isValidUrl(config.supabaseUrl)
                ? { name: "supabaseUrl", passed: true, message: "Supabase URL is valid", severity: "error" }
                : { name: "supabaseUrl", passed: false, message: `Supabase URL is not a valid URL: ${config.supabaseUrl}`, severity: "error" }
            : { name: "supabaseUrl", passed: false, message: "supabase_not_configured: Supabase URL is required for sync", severity: "error" },
    );

    // supabaseServiceRoleKey
    checks.push(
        config.supabaseServiceRoleKey
            ? config.supabaseServiceRoleKey.length >= 20
                ? { name: "supabaseServiceRoleKey", passed: true, message: "Service role key is set", severity: "error" }
                : { name: "supabaseServiceRoleKey", passed: false, message: "Service role key appears too short", severity: "warning" }
            : { name: "supabaseServiceRoleKey", passed: false, message: "supabase_not_configured: Supabase service_role key is required for sync", severity: "error" },
    );

    // upsertRpcName (optional, warn if customised)
    if (config.upsertRpcName && config.upsertRpcName !== "upsert_oidc_user") {
        checks.push({
            name: "upsertRpcName",
            passed: true,
            message: `Custom RPC name: ${config.upsertRpcName}`,
            severity: "warning",
        });
    }

    return {
        valid: checks.filter((c) => c.severity === "error").every((c) => c.passed),
        checks,
    };
}

/* ------------------------------------------------------------------ */
/*  Combined validation                                                */
/* ------------------------------------------------------------------ */

/**
 * Validate both Authentik and Supabase sync configuration in one call.
 *
 * Useful as a startup / health-check / deploy-time validation gate.
 */
export function validateFullConfig(
    authentikConfig: Partial<AuthentikCallbackConfig>,
    supabaseConfig: Partial<SupabaseSyncConfig>,
): ConfigValidationResult {
    const authentik = validateAuthentikConfig(authentikConfig);
    const supabase = validateSupabaseSyncConfig(supabaseConfig);

    const checks = [...authentik.checks, ...supabase.checks];
    return {
        valid: checks.filter((c) => c.severity === "error").every((c) => c.passed),
        checks,
    };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isValidUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Endpoint discovery                                                 */
/* ------------------------------------------------------------------ */

/**
 * Discover OIDC endpoint URLs from an Authentik issuer's
 * `.well-known/openid-configuration`.
 *
 * **Important:** Authentik places most OIDC endpoints (token, userinfo,
 * authorize, revocation) at the `/application/o/` level, *not* under the
 * per-app issuer path. For example, with:
 *   issuer = `https://auth.example.com/application/o/my-app/`
 * the token endpoint is:
 *   `https://auth.example.com/application/o/token/`
 *
 * This function fetches the correct endpoint URLs from the well-known
 * document so callers never need to guess.
 *
 * ```ts
 * const endpoints = await discoverEndpoints("https://auth.example.com/application/o/my-app/");
 * // endpoints.token      → "https://auth.example.com/application/o/token/"
 * // endpoints.userinfo   → "https://auth.example.com/application/o/userinfo/"
 * // endpoints.endSession → "https://auth.example.com/application/o/my-app/end-session/"
 * ```
 */
export async function discoverEndpoints(
    issuer: string,
    fetchFn: typeof fetch = fetch,
): Promise<AuthentikEndpoints> {
    const base = issuer.endsWith("/") ? issuer : `${issuer}/`;
    const wellKnownUrl = `${base}.well-known/openid-configuration`;

    const response = await fetchFn(wellKnownUrl);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch .well-known/openid-configuration from ${wellKnownUrl} (HTTP ${response.status})`,
        );
    }

    const doc = (await response.json()) as Record<string, unknown>;

    const authorization = doc.authorization_endpoint;
    const token = doc.token_endpoint;
    const userinfo = doc.userinfo_endpoint;

    if (
        typeof authorization !== "string" ||
        typeof token !== "string" ||
        typeof userinfo !== "string"
    ) {
        throw new Error(
            "Well-known document missing required endpoints (authorization_endpoint, token_endpoint, userinfo_endpoint)",
        );
    }

    return {
        authorization,
        token,
        userinfo,
        revocation: typeof doc.revocation_endpoint === "string" ? doc.revocation_endpoint : undefined,
        endSession: typeof doc.end_session_endpoint === "string" ? doc.end_session_endpoint : undefined,
    };
}
