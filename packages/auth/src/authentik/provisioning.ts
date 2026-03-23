/**
 * Provisioning adapters for Authentik ↔ application user sync.
 *
 * This module provides pluggable adapters that run **server-side** after
 * a successful Authentik callback to ensure the authenticated user exists
 * in the application's local user store.
 *
 * Adapters are **idempotent** and **fail-closed**: if sync fails the
 * callback handler must not redirect the user into the protected app.
 *
 * Reference:
 * - CIG apps/dashboard/app/api/auth/sync/route.ts
 * - CIG apps/dashboard/lib/authSync.ts
 */

import type {
    ProvisioningAdapter,
    ProvisioningPayload,
    ProvisioningResult,
    SupabaseSyncConfig,
} from "./types";

/* ------------------------------------------------------------------ */
/*  No-op adapter                                                      */
/* ------------------------------------------------------------------ */

/**
 * A no-op provisioning adapter that always succeeds.
 *
 * Use this when the app does not need post-login user sync.
 */
export class NoopProvisioningAdapter implements ProvisioningAdapter {
    async sync(_payload: ProvisioningPayload): Promise<ProvisioningResult> {
        return { synced: true };
    }
}

/* ------------------------------------------------------------------ */
/*  Custom adapter (function-based)                                    */
/* ------------------------------------------------------------------ */

/**
 * Create a provisioning adapter from a plain function.
 *
 * ```ts
 * const adapter = createProvisioningAdapter(async (payload) => {
 *   await myDb.upsertUser(payload);
 *   return { synced: true, appUserId: "..." };
 * });
 * ```
 */
export function createProvisioningAdapter(
    syncFn: (payload: ProvisioningPayload) => Promise<ProvisioningResult>,
): ProvisioningAdapter {
    return { sync: syncFn };
}

/* ------------------------------------------------------------------ */
/*  Supabase sync adapter                                              */
/* ------------------------------------------------------------------ */

/**
 * Normalise a provisioning payload for Supabase sync.
 * - Lowercases email
 * - Resolves name from multiple claim fields
 * - Applies default issuer and provider
 */
export function normalizePayload(
    payload: ProvisioningPayload,
    defaultIssuer?: string,
): ProvisioningPayload {
    const rawClaims = payload.rawClaims || {};

    const name =
        payload.name ||
        (rawClaims.preferred_username as string) ||
        (rawClaims.name as string) ||
        payload.email?.split("@")[0] ||
        "";

    return {
        ...payload,
        email: (payload.email || "").toLowerCase().trim(),
        name: name.trim() || undefined,
        iss: payload.iss || defaultIssuer || "",
        provider: payload.provider || "authentik",
    };
}

/**
 * Build the user_metadata and app_metadata objects for a Supabase
 * auth.users shadow record.
 */
function buildShadowMetadata(payload: ProvisioningPayload): {
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
} {
    return {
        user_metadata: {
            name: payload.name,
            full_name: payload.name,
            avatar_url: payload.picture,
            oidc_sub: payload.sub,
            oidc_issuer: payload.iss,
            upstream_provider: payload.provider,
        },
        app_metadata: {
            provider: "authentik",
            auth_source: "authentik",
            oidc_sub: payload.sub,
            oidc_issuer: payload.iss,
            upstream_provider: payload.provider,
        },
    };
}

/**
 * SupabaseClient interface — minimal subset of `@supabase/supabase-js`
 * needed for the sync adapter. This avoids a hard dependency.
 */
interface SupabaseAdminClient {
    auth: {
        admin: {
            listUsers(params?: {
                page?: number;
                perPage?: number;
            }): Promise<{ data: { users: SupabaseAuthUser[] }; error: SupabaseError | null }>;
            createUser(params: Record<string, unknown>): Promise<{
                data: { user: SupabaseAuthUser | null };
                error: SupabaseError | null;
            }>;
            updateUserById(
                id: string,
                params: Record<string, unknown>,
            ): Promise<{
                data: { user: SupabaseAuthUser | null };
                error: SupabaseError | null;
            }>;
            deleteUser(id: string): Promise<{ error: SupabaseError | null }>;
        };
    };
    rpc(
        fn: string,
        params: Record<string, unknown>,
    ): Promise<{ data: unknown; error: SupabaseError | null }>;
}

interface SupabaseAuthUser {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
}

interface SupabaseError {
    message: string;
    code?: string;
}

/**
 * Find an existing shadow auth.users record by OIDC identity or email.
 *
 * Matching strategy (identity-first, per CIG production rules):
 * 1. Match by (oidc_sub + oidc_issuer) in app_metadata
 * 2. Fall back to email only when reusing an existing shadow user
 */
async function findShadowAuthUser(
    client: SupabaseAdminClient,
    payload: ProvisioningPayload,
): Promise<{ user: SupabaseAuthUser | null; matchedBy: "identity" | "email" | null }> {
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });

    if (error) {
        throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data.users;

    // 1. Identity-first match
    const identityMatch = users.find((u) => {
        const meta = u.app_metadata || {};
        return (
            meta.auth_source === "authentik" &&
            meta.oidc_sub === payload.sub &&
            meta.oidc_issuer === payload.iss
        );
    });

    if (identityMatch) {
        return { user: identityMatch, matchedBy: "identity" };
    }

    // 2. Email fallback
    if (payload.email) {
        const emailMatch = users.find(
            (u) => u.email?.toLowerCase() === payload.email.toLowerCase(),
        );
        if (emailMatch) {
            return { user: emailMatch, matchedBy: "email" };
        }
    }

    return { user: null, matchedBy: null };
}

/**
 * Ensure a shadow auth.users record exists and is up-to-date.
 *
 * Returns the auth user ID and whether the record was newly created
 * (important for rollback on downstream failure).
 */
async function ensureShadowAuthUser(
    client: SupabaseAdminClient,
    payload: ProvisioningPayload,
): Promise<{ authUserId: string; created: boolean; updated: boolean }> {
    const { user: existing, matchedBy } = await findShadowAuthUser(client, payload);
    const metadata = buildShadowMetadata(payload);

    if (existing) {
        // Check if metadata needs updating
        const currentMeta = existing.app_metadata || {};
        const needsUpdate =
            currentMeta.oidc_sub !== payload.sub ||
            currentMeta.oidc_issuer !== payload.iss ||
            (existing.user_metadata || {}).avatar_url !== payload.picture ||
            (existing.user_metadata || {}).name !== payload.name;

        if (needsUpdate || matchedBy === "email") {
            const { error } = await client.auth.admin.updateUserById(existing.id, {
                email: payload.email || existing.email,
                email_confirm: payload.emailVerified ?? false,
                ...metadata,
            });

            if (error) {
                throw new Error(`Failed to update shadow auth user: ${error.message}`);
            }

            return { authUserId: existing.id, created: false, updated: true };
        }

        return { authUserId: existing.id, created: false, updated: false };
    }

    // Create new shadow user
    const { data, error } = await client.auth.admin.createUser({
        email: payload.email,
        email_confirm: payload.emailVerified ?? false,
        role: "authenticated",
        ...metadata,
    });

    if (error) {
        throw new Error(`Failed to create shadow auth user: ${error.message}`);
    }

    if (!data.user) {
        throw new Error("Shadow auth user creation returned no user");
    }

    return { authUserId: data.user.id, created: true, updated: false };
}

/**
 * Authentik ↔ Supabase integrated sync adapter.
 *
 * This adapter implements the full CIG-proven sync flow:
 *
 * 1. Normalise the OIDC payload
 * 2. Ensure a shadow auth.users record (identity-first matching)
 * 3. Call the `upsert_oidc_user` RPC to sync into public.users
 * 4. Roll back the shadow auth.users record if the RPC fails
 *
 * The adapter requires a `SupabaseClient` created with `service_role` key.
 */
export class SupabaseSyncAdapter implements ProvisioningAdapter {
    private config: SupabaseSyncConfig;
    private client: SupabaseAdminClient;

    constructor(client: SupabaseAdminClient, config: SupabaseSyncConfig) {
        this.client = client;
        this.config = config;
    }

    async sync(payload: ProvisioningPayload): Promise<ProvisioningResult> {
        const normalized = normalizePayload(payload, this.config.defaultIssuer);

        if (!normalized.sub || !normalized.iss) {
            return {
                synced: false,
                error: "Missing required sub or iss in provisioning payload",
                errorCode: "invalid_payload",
            };
        }

        let shadowResult: { authUserId: string; created: boolean; updated: boolean } | null = null;

        // Step 1: Shadow auth.users (optional, default: true)
        if (this.config.createShadowAuthUser !== false) {
            try {
                shadowResult = await ensureShadowAuthUser(this.client, normalized);
            } catch (err) {
                return {
                    synced: false,
                    error: err instanceof Error ? err.message : "Shadow auth user sync failed",
                    errorCode: "shadow_auth_failed",
                };
            }
        }

        // Step 2: public.users upsert via RPC
        const rpcName = this.config.upsertRpcName || "upsert_oidc_user";
        const rpcParams: Record<string, unknown> = {
            p_sub: normalized.sub,
            p_iss: normalized.iss,
            p_email: normalized.email || null,
            p_email_verified: normalized.emailVerified ?? false,
            p_name: normalized.name || null,
            p_picture: normalized.picture || null,
            p_provider: normalized.provider || null,
            p_raw_claims: {
                ...(normalized.rawClaims || {}),
                ...(shadowResult
                    ? {
                          shadow_supabase_auth_user_id: shadowResult.authUserId,
                          shadow_supabase_auth_user_created: shadowResult.created,
                          shadow_supabase_auth_user_updated: shadowResult.updated,
                      }
                    : {}),
            },
        };

        const { error: rpcError } = await this.client.rpc(rpcName, rpcParams);

        if (rpcError) {
            // Rollback: delete newly created shadow auth.users row
            if (
                shadowResult?.created &&
                this.config.rollbackOnFailure !== false
            ) {
                try {
                    await this.client.auth.admin.deleteUser(shadowResult.authUserId);
                } catch {
                    // Best-effort rollback — log but don't mask the original error
                }
            }

            return {
                synced: false,
                authUserId: shadowResult?.authUserId,
                authUserCreated: shadowResult?.created,
                error: `RPC ${rpcName} failed: ${rpcError.message}`,
                errorCode: "rpc_upsert_failed",
            };
        }

        return {
            synced: true,
            authUserId: shadowResult?.authUserId,
            authUserCreated: shadowResult?.created,
            authUserUpdated: shadowResult?.updated,
        };
    }
}

/**
 * Create a Supabase sync adapter from a client and config.
 *
 * This is a convenience factory that avoids direct `new SupabaseSyncAdapter(...)`.
 *
 * ```ts
 * import { createClient } from "@supabase/supabase-js";
 *
 * const supabase = createClient(url, serviceRoleKey);
 * const adapter = createSupabaseSyncAdapter(supabase, {
 *   supabaseUrl: url,
 *   supabaseServiceRoleKey: serviceRoleKey,
 * });
 * ```
 */
export function createSupabaseSyncAdapter(
    client: SupabaseAdminClient,
    config: SupabaseSyncConfig,
): SupabaseSyncAdapter {
    return new SupabaseSyncAdapter(client, config);
}
