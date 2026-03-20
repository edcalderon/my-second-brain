export type OidcProvider = "google" | "discord" | string;

export interface OidcClaims {
    sub: string;
    iss: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    preferred_username?: string;
    [key: string]: unknown;
}

export interface OidcTokens {
    accessToken: string;
    tokenType?: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn?: number;
    expiresAt?: number;
    scope?: string;
}

export interface OidcSession {
    provider: OidcProvider;
    issuer: string;
    clientId: string;
    claims: OidcClaims;
    tokens: OidcTokens;
    createdAt: number;
}

export interface AuthentikEnvKeys {
    issuer: string;
    clientId: string;
    redirectUri: string;
}

export interface AuthentikOidcConfig {
    issuer?: string;
    clientId?: string;
    redirectUri?: string;
    scope?: string;
    env?: Record<string, string | undefined>;
    envKeys?: Partial<AuthentikEnvKeys>;
    providerSourceSlugs?: Record<string, string>;
    authorizePath?: string;
    tokenPath?: string;
    userinfoPath?: string;
    onSessionReady?: (claims: OidcClaims, tokens: OidcTokens, session: OidcSession) => void | Promise<void>;
    storageKey?: string;
    pendingStorageKey?: string;
    sessionStorage?: Storage;
    localStorage?: Storage;
    fetchFn?: typeof fetch;
}

interface ResolvedConfig {
    issuer: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    authorizePath: string;
    tokenPath: string;
    userinfoPath: string;
    storageKey: string;
    pendingStorageKey: string;
    providerSourceSlugs: Record<string, string>;
    sessionStorage: Storage;
    localStorage: Storage;
    fetchFn: typeof fetch;
    onSessionReady?: (claims: OidcClaims, tokens: OidcTokens, session: OidcSession) => void | Promise<void>;
}

interface PendingState {
    state: string;
    provider: OidcProvider;
    codeVerifier: string;
    createdAt: number;
}

const DEFAULT_ENV_KEYS: AuthentikEnvKeys = {
    issuer: "EXPO_PUBLIC_AUTHENTIK_ISSUER",
    clientId: "EXPO_PUBLIC_AUTHENTIK_CLIENT_ID",
    redirectUri: "EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI"
};

const DEFAULT_SCOPE = "openid profile email";
const DEFAULT_STORAGE_KEY = "authentik:oidc:session";
const DEFAULT_PENDING_STORAGE_KEY = "authentik:oidc:pending";
export const OIDC_INITIAL_SEARCH = "authentik:oidc:initial-search";

function isBrowserRuntime(): boolean {
    return typeof window !== "undefined";
}

function getProcessEnv(): Record<string, string | undefined> {
    const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return maybeProcess?.env || {};
}

function resolveEnvValue(config: AuthentikOidcConfig, key: keyof AuthentikEnvKeys): string | undefined {
    const envKeys = { ...DEFAULT_ENV_KEYS, ...(config.envKeys || {}) };
    const explicit = key === "issuer" ? config.issuer : key === "clientId" ? config.clientId : config.redirectUri;

    if (explicit && explicit.trim()) {
        return explicit.trim();
    }

    const envSource = config.env || getProcessEnv();
    const envKey = envKeys[key];
    return envSource[envKey]?.trim();
}

function ensurePathSuffix(pathname: string): string {
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function resolveEndpoint(issuer: string, explicitPath: string | undefined, fallbackPath: string): string {
    const issuerUrl = new URL(issuer);
    if (explicitPath) {
        return new URL(explicitPath, `${issuerUrl.origin}/`).toString();
    }

    const normalizedBase = ensurePathSuffix(issuerUrl.pathname);
    return new URL(`${normalizedBase}${fallbackPath}`, issuerUrl.origin).toString();
}

function getSessionStorage(config: AuthentikOidcConfig): Storage {
    if (config.sessionStorage) {
        return config.sessionStorage;
    }

    if (!isBrowserRuntime() || !window.sessionStorage) {
        throw new Error("CONFIG_ERROR: sessionStorage is unavailable in this runtime");
    }

    return window.sessionStorage;
}

function getLocalStorage(config: AuthentikOidcConfig): Storage {
    if (config.localStorage) {
        return config.localStorage;
    }

    if (!isBrowserRuntime() || !window.localStorage) {
        throw new Error("CONFIG_ERROR: localStorage is unavailable in this runtime");
    }

    return window.localStorage;
}

function getFetch(config: AuthentikOidcConfig): typeof fetch {
    if (config.fetchFn) {
        return config.fetchFn;
    }
    if (typeof fetch === "undefined") {
        throw new Error("CONFIG_ERROR: fetch is unavailable in this runtime");
    }
    return fetch;
}

function resolveConfig(config: AuthentikOidcConfig = {}): ResolvedConfig {
    const issuer = resolveEnvValue(config, "issuer");
    const clientId = resolveEnvValue(config, "clientId");
    const redirectUri = resolveEnvValue(config, "redirectUri");

    if (!issuer || !clientId || !redirectUri) {
        throw new Error("CONFIG_ERROR: Missing Authentik issuer, clientId, or redirectUri");
    }

    return {
        issuer,
        clientId,
        redirectUri,
        scope: config.scope || DEFAULT_SCOPE,
        authorizePath: resolveEndpoint(issuer, config.authorizePath, "authorize/"),
        tokenPath: resolveEndpoint(issuer, config.tokenPath, "token/"),
        userinfoPath: resolveEndpoint(issuer, config.userinfoPath, "userinfo/"),
        storageKey: config.storageKey || DEFAULT_STORAGE_KEY,
        pendingStorageKey: config.pendingStorageKey || DEFAULT_PENDING_STORAGE_KEY,
        providerSourceSlugs: config.providerSourceSlugs || {},
        sessionStorage: getSessionStorage(config),
        localStorage: getLocalStorage(config),
        fetchFn: getFetch(config),
        onSessionReady: config.onSessionReady
    };
}

function encodeBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return encodeBase64Url(bytes);
}

async function sha256(input: string): Promise<Uint8Array> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return new Uint8Array(digest);
}

async function buildPkcePair(): Promise<{ verifier: string; challenge: string }> {
    const verifier = randomString(64);
    const challenge = encodeBase64Url(await sha256(verifier));
    return { verifier, challenge };
}

function parsePendingState(rawValue: string | null): PendingState | null {
    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue) as PendingState;
    } catch {
        return null;
    }
}

function getSourceSlug(provider: OidcProvider, config: ResolvedConfig): string {
    return config.providerSourceSlugs[provider] || provider;
}

export function isAuthentikConfigured(config: AuthentikOidcConfig = {}): boolean {
    try {
        const issuer = resolveEnvValue(config, "issuer");
        const clientId = resolveEnvValue(config, "clientId");
        const redirectUri = resolveEnvValue(config, "redirectUri");
        return Boolean(issuer && clientId && redirectUri);
    } catch {
        return false;
    }
}

export function hasPendingAuthentikCallback(searchString?: string): boolean {
    const rawSearch =
        typeof searchString === "string"
            ? searchString
            : isBrowserRuntime()
                ? window.location.search
                : "";

    const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
    return Boolean(params.get("code") && params.get("state"));
}

export function readOidcSession(config: AuthentikOidcConfig = {}): OidcSession | null {
    const storage = config.localStorage || (isBrowserRuntime() ? window.localStorage : null);
    if (!storage) {
        return null;
    }

    const key = config.storageKey || DEFAULT_STORAGE_KEY;
    const rawValue = storage.getItem(key);
    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue) as OidcSession;
    } catch {
        return null;
    }
}

export function clearOidcSession(config: AuthentikOidcConfig = {}): void {
    const localStorageRef = config.localStorage || (isBrowserRuntime() ? window.localStorage : null);
    const sessionStorageRef = config.sessionStorage || (isBrowserRuntime() ? window.sessionStorage : null);

    const sessionKey = config.storageKey || DEFAULT_STORAGE_KEY;
    const pendingKey = config.pendingStorageKey || DEFAULT_PENDING_STORAGE_KEY;

    localStorageRef?.removeItem(sessionKey);
    sessionStorageRef?.removeItem(pendingKey);
    sessionStorageRef?.removeItem(OIDC_INITIAL_SEARCH);
}

export async function startAuthentikOAuthFlow(provider: OidcProvider, config: AuthentikOidcConfig = {}): Promise<void> {
    if (!isBrowserRuntime()) {
        throw new Error("CONFIG_ERROR: startAuthentikOAuthFlow requires a browser runtime");
    }

    const resolved = resolveConfig(config);
    const { verifier, challenge } = await buildPkcePair();
    const state = randomString(32);

    const pendingState: PendingState = {
        state,
        provider,
        codeVerifier: verifier,
        createdAt: Date.now()
    };

    resolved.sessionStorage.setItem(resolved.pendingStorageKey, JSON.stringify(pendingState));
    resolved.sessionStorage.setItem(OIDC_INITIAL_SEARCH, window.location.search || "");

    const authorizeUrl = new URL(resolved.authorizePath);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", resolved.clientId);
    authorizeUrl.searchParams.set("redirect_uri", resolved.redirectUri);
    authorizeUrl.searchParams.set("scope", resolved.scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    const loginUrl = new URL(`/source/oauth/login/${encodeURIComponent(getSourceSlug(provider, resolved))}/`, new URL(resolved.issuer).origin);
    loginUrl.searchParams.set("next", authorizeUrl.toString());

    window.location.assign(loginUrl.toString());
}

export async function handleAuthentikCallback(searchString?: string, config: AuthentikOidcConfig = {}): Promise<OidcSession> {
    const resolved = resolveConfig(config);

    const rawSearch =
        typeof searchString === "string"
            ? searchString
            : isBrowserRuntime()
                ? window.location.search
                : "";

    const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
    const error = params.get("error");
    if (error) {
        const description = params.get("error_description") || "OAuth callback returned an error";
        throw new Error(`PROVIDER_ERROR: ${error} (${description})`);
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
        throw new Error("SESSION_ERROR: Missing code or state in Authentik callback");
    }

    const pending = parsePendingState(resolved.sessionStorage.getItem(resolved.pendingStorageKey));
    if (!pending) {
        throw new Error("SESSION_ERROR: Missing pending Authentik state in sessionStorage");
    }

    if (pending.state !== state) {
        throw new Error("SESSION_ERROR: Invalid Authentik callback state");
    }

    const tokenPayload = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: resolved.redirectUri,
        client_id: resolved.clientId,
        code_verifier: pending.codeVerifier
    });

    const tokenResponse = await resolved.fetchFn(resolved.tokenPath, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: tokenPayload
    });

    if (!tokenResponse.ok) {
        throw new Error(`NETWORK_ERROR: Token exchange failed with status ${tokenResponse.status}`);
    }

    const tokenJson = (await tokenResponse.json()) as {
        access_token?: string;
        token_type?: string;
        refresh_token?: string;
        id_token?: string;
        expires_in?: number;
        scope?: string;
    };

    if (!tokenJson.access_token) {
        throw new Error("SESSION_ERROR: Token response missing access_token");
    }

    const userinfoResponse = await resolved.fetchFn(resolved.userinfoPath, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenJson.access_token}`
        }
    });

    if (!userinfoResponse.ok) {
        throw new Error(`NETWORK_ERROR: Userinfo request failed with status ${userinfoResponse.status}`);
    }

    const claims = (await userinfoResponse.json()) as OidcClaims;
    if (!claims.sub || !claims.iss) {
        throw new Error("SESSION_ERROR: Userinfo response missing required claims (sub, iss)");
    }

    const now = Date.now();
    const expiresAt = tokenJson.expires_in ? now + tokenJson.expires_in * 1000 : undefined;

    const tokens: OidcTokens = {
        accessToken: tokenJson.access_token,
        tokenType: tokenJson.token_type,
        refreshToken: tokenJson.refresh_token,
        idToken: tokenJson.id_token,
        expiresIn: tokenJson.expires_in,
        expiresAt,
        scope: tokenJson.scope
    };

    const session: OidcSession = {
        provider: pending.provider,
        issuer: resolved.issuer,
        clientId: resolved.clientId,
        claims,
        tokens,
        createdAt: now
    };

    resolved.localStorage.setItem(resolved.storageKey, JSON.stringify(session));
    resolved.sessionStorage.removeItem(resolved.pendingStorageKey);

    if (resolved.onSessionReady) {
        await resolved.onSessionReady(claims, tokens, session);
    }

    return session;
}