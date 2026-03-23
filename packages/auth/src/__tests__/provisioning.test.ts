/**
 * Tests for provisioning adapters.
 */

import {
    NoopProvisioningAdapter,
    createProvisioningAdapter,
    normalizePayload,
    SupabaseSyncAdapter,
} from "../authentik/provisioning";
import type {
    ProvisioningPayload,
    SupabaseSyncConfig,
} from "../authentik/types";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const basePayload: ProvisioningPayload = {
    sub: "user-sub-123",
    iss: "https://auth.example.com",
    email: "User@Example.com",
    emailVerified: true,
    name: "Test User",
    picture: "https://example.com/photo.jpg",
    provider: "google",
    rawClaims: { preferred_username: "testuser" },
};

/* ------------------------------------------------------------------ */
/*  NoopProvisioningAdapter                                            */
/* ------------------------------------------------------------------ */

describe("NoopProvisioningAdapter", () => {
    it("always returns synced: true", async () => {
        const adapter = new NoopProvisioningAdapter();
        const result = await adapter.sync(basePayload);
        expect(result.synced).toBe(true);
    });
});

/* ------------------------------------------------------------------ */
/*  createProvisioningAdapter                                          */
/* ------------------------------------------------------------------ */

describe("createProvisioningAdapter", () => {
    it("wraps a plain function into an adapter", async () => {
        const adapter = createProvisioningAdapter(async (payload) => ({
            synced: true,
            appUserId: `app-${payload.sub}`,
        }));

        const result = await adapter.sync(basePayload);
        expect(result.synced).toBe(true);
        expect(result.appUserId).toBe("app-user-sub-123");
    });

    it("propagates errors from the sync function", async () => {
        const adapter = createProvisioningAdapter(async () => {
            throw new Error("DB down");
        });

        await expect(adapter.sync(basePayload)).rejects.toThrow("DB down");
    });
});

/* ------------------------------------------------------------------ */
/*  normalizePayload                                                   */
/* ------------------------------------------------------------------ */

describe("normalizePayload", () => {
    it("lowercases email", () => {
        const result = normalizePayload(basePayload);
        expect(result.email).toBe("user@example.com");
    });

    it("trims email whitespace", () => {
        const result = normalizePayload({ ...basePayload, email: "  User@Example.COM  " });
        expect(result.email).toBe("user@example.com");
    });

    it("uses name from payload when available", () => {
        const result = normalizePayload(basePayload);
        expect(result.name).toBe("Test User");
    });

    it("falls back to preferred_username from rawClaims", () => {
        const payload: ProvisioningPayload = {
            ...basePayload,
            name: undefined,
        };
        const result = normalizePayload(payload);
        expect(result.name).toBe("testuser");
    });

    it("falls back to email local part when no name or username", () => {
        const payload: ProvisioningPayload = {
            ...basePayload,
            name: undefined,
            rawClaims: {},
        };
        const result = normalizePayload(payload);
        // Email is "User@Example.com" → local part is "User" (before lowercase)
        expect(result.name).toBe("User");
    });

    it("applies default issuer when iss is empty", () => {
        const payload: ProvisioningPayload = { ...basePayload, iss: "" };
        const result = normalizePayload(payload, "https://default-issuer.com");
        expect(result.iss).toBe("https://default-issuer.com");
    });

    it("applies default provider when provider is missing", () => {
        const payload: ProvisioningPayload = { ...basePayload, provider: undefined };
        const result = normalizePayload(payload);
        expect(result.provider).toBe("authentik");
    });
});

/* ------------------------------------------------------------------ */
/*  SupabaseSyncAdapter                                                */
/* ------------------------------------------------------------------ */

describe("SupabaseSyncAdapter", () => {
    const supabaseConfig: SupabaseSyncConfig = {
        supabaseUrl: "https://project.supabase.co",
        supabaseServiceRoleKey: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test-key",
        createShadowAuthUser: true,
        rollbackOnFailure: true,
    };

    function mockSupabaseClient(options?: {
        listUsersResult?: { users: Array<{ id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }> };
        createUserResult?: { user: { id: string } | null; error: { message: string } | null };
        updateUserResult?: { user: { id: string } | null; error: { message: string } | null };
        deleteUserResult?: { error: { message: string } | null };
        rpcResult?: { data: unknown; error: { message: string } | null };
    }) {
        return {
            auth: {
                admin: {
                    listUsers: async () => ({
                        data: { users: options?.listUsersResult?.users || [] },
                        error: null,
                    }),
                    createUser: async () => ({
                        data: { user: options?.createUserResult?.user || { id: "new-auth-id" } },
                        error: options?.createUserResult?.error || null,
                    }),
                    updateUserById: async () => ({
                        data: { user: options?.updateUserResult?.user || { id: "existing-auth-id" } },
                        error: options?.updateUserResult?.error || null,
                    }),
                    deleteUser: async () => ({
                        error: options?.deleteUserResult?.error || null,
                    }),
                },
            },
            rpc: async () => ({
                data: options?.rpcResult?.data || null,
                error: options?.rpcResult?.error || null,
            }),
        } as any;
    }

    it("creates new shadow user and calls RPC", async () => {
        const client = mockSupabaseClient();
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(result.authUserId).toBe("new-auth-id");
        expect(result.authUserCreated).toBe(true);
    });

    it("matches existing user by identity", async () => {
        const client = mockSupabaseClient({
            listUsersResult: {
                users: [
                    {
                        id: "existing-id",
                        email: "user@example.com",
                        app_metadata: {
                            auth_source: "authentik",
                            oidc_sub: "user-sub-123",
                            oidc_issuer: "https://auth.example.com",
                        },
                        user_metadata: {
                            name: "Test User",
                            avatar_url: "https://example.com/photo.jpg",
                        },
                    },
                ],
            },
        });
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(result.authUserId).toBe("existing-id");
        expect(result.authUserCreated).toBe(false);
    });

    it("returns error when payload is missing sub", async () => {
        const client = mockSupabaseClient();
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync({ ...basePayload, sub: "" });

        expect(result.synced).toBe(false);
        expect(result.errorCode).toBe("invalid_payload");
    });

    it("rolls back shadow user when RPC fails", async () => {
        let deleteUserCalled = false;
        const client = mockSupabaseClient({
            rpcResult: { data: null, error: { message: "RPC error" } },
        });
        const originalDeleteUser = client.auth.admin.deleteUser;
        client.auth.admin.deleteUser = async (id: string) => {
            deleteUserCalled = true;
            return originalDeleteUser(id);
        };

        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);
        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(false);
        expect(result.errorCode).toBe("rpc_upsert_failed");
        expect(deleteUserCalled).toBe(true);
    });

    it("skips shadow user creation when disabled", async () => {
        let createUserCalled = false;
        const client = mockSupabaseClient();
        const originalCreateUser = client.auth.admin.createUser;
        client.auth.admin.createUser = async (...args: any[]) => {
            createUserCalled = true;
            return originalCreateUser(...args);
        };

        const config: SupabaseSyncConfig = { ...supabaseConfig, createShadowAuthUser: false };
        const adapter = new SupabaseSyncAdapter(client, config);
        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(createUserCalled).toBe(false);
        expect(result.authUserId).toBeUndefined();
    });

    it("does not rollback when rollbackOnFailure is false", async () => {
        let deleteUserCalled = false;
        const client = mockSupabaseClient({
            rpcResult: { data: null, error: { message: "RPC error" } },
        });
        client.auth.admin.deleteUser = async () => {
            deleteUserCalled = true;
            return { error: null };
        };

        const config: SupabaseSyncConfig = { ...supabaseConfig, rollbackOnFailure: false };
        const adapter = new SupabaseSyncAdapter(client, config);
        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(false);
        expect(deleteUserCalled).toBe(false);
    });
});
