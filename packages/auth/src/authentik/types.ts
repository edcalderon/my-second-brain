/**
 * @edcalderon/auth — Authentik flow + provisioning kit types.
 *
 * Generalised from the production CIG implementation:
 * https://github.com/edwardcalderon/ComputeIntelligenceGraph/tree/main/packages/auth
 */

/* ------------------------------------------------------------------ */
/*  OIDC provider identifiers                                         */
/* ------------------------------------------------------------------ */

/** Well-known social-login provider slugs, plus any custom string. */
export type AuthentikProvider = "google" | "github" | "discord" | (string & {});

/* ------------------------------------------------------------------ */
/*  Endpoint discovery                                                 */
/* ------------------------------------------------------------------ */

/**
 * Resolved OIDC endpoint URLs for an Authentik provider.
 *
 * These can be obtained from `.well-known/openid-configuration`
 * via `discoverEndpoints()`, or supplied manually.
 *
 * **Important:** Authentik places most OIDC endpoints at the
 * `/application/o/` level, *not* under the per-app issuer path.
 * E.g. with issuer `https://auth.example.com/application/o/my-app/`,
 * the token endpoint is `https://auth.example.com/application/o/token/`.
 * Always use explicit URLs or discovery — do not guess from the issuer.
 */
export interface AuthentikEndpoints {
    /** Authorization endpoint (full URL). */
    authorization: string;
    /** Token endpoint (full URL). */
    token: string;
    /** Userinfo endpoint (full URL). */
    userinfo: string;
    /** Token revocation endpoint (full URL). */
    revocation?: string;
    /** RP-initiated logout / end-session endpoint (full URL). */
    endSession?: string;
}

/* ------------------------------------------------------------------ */
/*  Cross-origin relay                                                 */
/* ------------------------------------------------------------------ */

/** Configuration for the cross-origin relay handler. */
export interface AuthentikRelayConfig {
    /** Authentik issuer base URL (e.g. "https://auth.example.com"). */
    issuer: string;
    /** OIDC Application client_id registered in Authentik. */
    clientId: string;
    /** The callback URL that will receive the authorization code. */
    redirectUri: string;
    /** OIDC scopes (default: "openid profile email"). */
    scope?: string;
    /**
     * Explicit OIDC authorize endpoint URL.
     * Required — use `discoverEndpoints()` or supply manually.
     */
    authorizePath: string;
    /**
     * Map of provider slug → Authentik flow slug.
     * E.g. `{ google: "my-app-google-login", github: "my-app-github-login" }`.
     * When a provider is not in the map the provider string is used as-is.
     */
    providerFlowSlugs?: Record<string, string>;
    /**
     * Storage key prefix used for PKCE state in sessionStorage.
     * Default: "authentik_relay".
     */
    storageKeyPrefix?: string;
}

/** Parsed query params forwarded from the login origin to the relay. */
export interface RelayIncomingParams {
    provider: string;
    codeVerifier: string;
    codeChallenge: string;
    state: string;
    /** Optional post-login redirect target within the app. */
    next?: string;
}

/** Result of the relay handler — an HTML snippet or a redirect URL. */
export interface RelayHandlerResult {
    /** Minimal HTML page that stores PKCE params and redirects to Authentik. */
    html: string;
}

/* ------------------------------------------------------------------ */
/*  Callback                                                           */
/* ------------------------------------------------------------------ */

/** Configuration for the enhanced callback handler. */
export interface AuthentikCallbackConfig {
    /** Authentik issuer base URL. */
    issuer: string;
    /** OIDC Application client_id. */
    clientId: string;
    /** The callback URL that received the authorization code. */
    redirectUri: string;
    /** OIDC scopes (default: "openid profile email"). */
    scope?: string;
    /**
     * Explicit token endpoint URL.
     * Required — use `discoverEndpoints()` or supply manually.
     */
    tokenEndpoint: string;
    /**
     * Explicit userinfo endpoint URL.
     * Required — use `discoverEndpoints()` or supply manually.
     */
    userinfoEndpoint: string;
    /** Fetch implementation override (for testing or server runtimes). */
    fetchFn?: typeof fetch;
}

/** The raw OIDC token response from Authentik. */
export interface AuthentikTokenResponse {
    access_token: string;
    token_type?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    scope?: string;
}

/** Parsed OIDC claims from the userinfo endpoint. */
export interface AuthentikClaims {
    sub: string;
    iss: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    preferred_username?: string;
    picture?: string;
    [key: string]: unknown;
}

/** Tokens + claims obtained after a successful callback exchange. */
export interface AuthentikCallbackResult {
    tokens: AuthentikTokenResponse;
    claims: AuthentikClaims;
    provider: string;
}

/* ------------------------------------------------------------------ */
/*  Logout                                                             */
/* ------------------------------------------------------------------ */

/** Configuration for the logout orchestrator. */
export interface AuthentikLogoutConfig {
    /** Authentik issuer base URL. */
    issuer: string;
    /** URL the browser should land on after Authentik clears its session. */
    postLogoutRedirectUri: string;
    /**
     * Explicit RP-initiated end-session endpoint URL.
     * Required — use `discoverEndpoints()` or supply manually.
     */
    endSessionEndpoint: string;
    /**
     * Explicit token revocation endpoint URL.
     * Optional — when omitted, revocation is skipped.
     */
    revocationEndpoint?: string;
    /** OIDC Application client_id (used in token revocation). */
    clientId?: string;
    /** Fetch implementation override. */
    fetchFn?: typeof fetch;
}

/** Result of a logout orchestration. */
export interface AuthentikLogoutResult {
    /** The full RP-initiated logout URL the browser should navigate to. */
    endSessionUrl: string;
    /** Whether the access-token revocation succeeded. */
    tokenRevoked: boolean;
}

/* ------------------------------------------------------------------ */
/*  Provisioning adapters                                              */
/* ------------------------------------------------------------------ */

/**
 * Payload sent to the provisioning adapter after a successful callback.
 * Modelled after CIG's OidcSyncPayload.
 */
export interface ProvisioningPayload {
    /** OIDC subject identifier. */
    sub: string;
    /** OIDC issuer URL. */
    iss: string;
    /** User email (normalised to lowercase). */
    email: string;
    /** Whether the email is verified by the OIDC provider. */
    emailVerified?: boolean;
    /** Display name. */
    name?: string;
    /** Avatar / profile picture URL. */
    picture?: string;
    /** Upstream social provider slug (e.g. "google", "github", "authentik"). */
    provider?: string;
    /** The full set of OIDC claims as received from Authentik. */
    rawClaims?: Record<string, unknown>;
}

/**
 * Result returned by a provisioning adapter.
 * The `synced` flag **must** be `true` for the callback to proceed with redirect.
 */
export interface ProvisioningResult {
    /** Whether the sync completed successfully. */
    synced: boolean;
    /** The app-level user ID (from public.users or equivalent). */
    appUserId?: string;
    /** Supabase auth.users ID when shadow-user mode is used. */
    authUserId?: string;
    /** Whether a new shadow auth.users row was created (for rollback tracking). */
    authUserCreated?: boolean;
    /** Whether an existing shadow auth.users row was updated. */
    authUserUpdated?: boolean;
    /** Human-readable diagnostic on failure. */
    error?: string;
    /** Machine-readable error code. */
    errorCode?: string;
}

/**
 * A provisioning adapter is a server-side function that ensures the
 * Authentik-authenticated user exists in the application's local user store.
 *
 * Adapters must be **idempotent** and **fail-closed**: if provisioning fails
 * the callback must not redirect the user into the protected app.
 */
export interface ProvisioningAdapter {
    /**
     * Sync the Authentik identity into the local user store.
     * Must return `{ synced: true }` for the callback flow to succeed.
     */
    sync(payload: ProvisioningPayload): Promise<ProvisioningResult>;
}

/* ------------------------------------------------------------------ */
/*  Supabase-specific provisioning                                     */
/* ------------------------------------------------------------------ */

/** Config for the Authentik ↔ Supabase integrated sync adapter. */
export interface SupabaseSyncConfig {
    /** Supabase project URL. */
    supabaseUrl: string;
    /** Supabase service_role key (server-side only). */
    supabaseServiceRoleKey: string;
    /**
     * Name of the Supabase RPC function that upserts into public.users.
     * Default: "upsert_oidc_user".
     */
    upsertRpcName?: string;
    /**
     * Name of the Supabase RPC function that links the shadow auth.users
     * ID to the public.users row.
     * Default: "link_shadow_auth_user".
     */
    linkShadowRpcName?: string;
    /**
     * Whether to create a shadow user in auth.users.
     * Default: true (recommended for CIG-style setups).
     */
    createShadowAuthUser?: boolean;
    /**
     * Default OIDC issuer to use when payload.iss is not provided.
     * Falls back to the Authentik issuer configured elsewhere.
     */
    defaultIssuer?: string;
    /**
     * Whether to rollback newly created shadow auth.users rows
     * when downstream public.users sync fails.
     * Default: true.
     */
    rollbackOnFailure?: boolean;
}

/** Diagnostic result from the config-validation doctor helper. */
export interface ConfigValidationResult {
    /** Whether the configuration is valid. */
    valid: boolean;
    /** Individual check results. */
    checks: ConfigCheck[];
}

export interface ConfigCheck {
    /** Short name of the check. */
    name: string;
    /** Whether this check passed. */
    passed: boolean;
    /** Human-readable message. */
    message: string;
    /** Severity when check fails. */
    severity: "error" | "warning";
}

/* ------------------------------------------------------------------ */
/*  Safe redirect                                                      */
/* ------------------------------------------------------------------ */

/** Configuration for the safe redirect resolver. */
export interface SafeRedirectConfig {
    /** Allowed origin(s) for redirects. */
    allowedOrigins: string[];
    /** Fallback URL when the requested redirect is not safe. */
    fallbackUrl: string;
}
