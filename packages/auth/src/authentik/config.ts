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
