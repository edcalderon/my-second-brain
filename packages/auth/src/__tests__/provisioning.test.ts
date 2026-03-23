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
        listUsersPages?: Array<{ users: Array<{ id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }> }>;
        createUserResult?: { user: { id: string } | null; error: { message: string } | null };
        updateUserResult?: { user: { id: string } | null; error: { message: string } | null };
        deleteUserResult?: { error: { message: string } | null };
        rpcResult?: { data: unknown; error: { message: string } | null };
        rpcResults?: Array<{ data: unknown; error: { message: string } | null }>;
    }) {
        let listPageIndex = 0;
        let rpcCallIndex = 0;
        const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
        return {
            auth: {
                admin: {
                    listUsers: async () => {
                        if (options?.listUsersPages) {
                            const page = options.listUsersPages[listPageIndex] || { users: [] };
                            listPageIndex++;
                            return { data: page, error: null };
                        }
                        return {
                            data: { users: options?.listUsersResult?.users || [] },
                            error: null,
                        };
                    },
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
            rpc: async (fn: string, params: Record<string, unknown>) => {
                rpcCalls.push({ fn, params });
                if (options?.rpcResults) {
                    const result = options.rpcResults[rpcCallIndex] || { data: null, error: null };
                    rpcCallIndex++;
                    return result;
                }
                return {
                    data: options?.rpcResult?.data || null,
                    error: options?.rpcResult?.error || null,
                };
            },
            _rpcCalls: rpcCalls,
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

    it("finds user on page 2 via paginated identity lookup", async () => {
        // Page 1: 1000 unrelated users (triggers pagination)
        const page1Users = Array.from({ length: 1000 }, (_, i) => ({
            id: `user-${i}`,
            email: `user${i}@other.com`,
            app_metadata: {},
        }));

        // Page 2: the matching user
        const page2Users = [
            {
                id: "found-on-page-2",
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
        ];

        const client = mockSupabaseClient({
            listUsersPages: [
                { users: page1Users },
                { users: page2Users },
            ],
        });
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(result.authUserId).toBe("found-on-page-2");
        expect(result.authUserCreated).toBe(false);
    });

    it("finds user by email on page 2 when no identity match exists", async () => {
        // Page 1: 1000 unrelated users
        const page1Users = Array.from({ length: 1000 }, (_, i) => ({
            id: `user-${i}`,
            email: `user${i}@other.com`,
            app_metadata: {},
        }));

        // Page 2: email match only (no identity match)
        const page2Users = [
            {
                id: "email-match-page-2",
                email: "user@example.com",
                app_metadata: {},
            },
        ];

        const client = mockSupabaseClient({
            listUsersPages: [
                { users: page1Users },
                { users: page2Users },
            ],
        });
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(result.authUserId).toBe("email-match-page-2");
    });

    it("calls link_shadow_auth_user after successful upsert", async () => {
        const client = mockSupabaseClient({
            rpcResults: [
                { data: null, error: null },  // upsert_oidc_user
                { data: null, error: null },  // link_shadow_auth_user
            ],
        });
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        // Verify both RPCs were called
        const rpcCalls = (client as any)._rpcCalls;
        expect(rpcCalls).toHaveLength(2);
        expect(rpcCalls[0].fn).toBe("upsert_oidc_user");
        expect(rpcCalls[1].fn).toBe("link_shadow_auth_user");
        expect(rpcCalls[1].params).toEqual({
            p_sub: "user-sub-123",
            p_iss: "https://auth.example.com",
            p_shadow_auth_user_id: "new-auth-id",
        });
    });

    it("uses custom linkShadowRpcName when configured", async () => {
        const client = mockSupabaseClient({
            rpcResults: [
                { data: null, error: null },
                { data: null, error: null },
            ],
        });
        const config: SupabaseSyncConfig = { ...supabaseConfig, linkShadowRpcName: "custom_link_rpc" };
        const adapter = new SupabaseSyncAdapter(client, config);

        await adapter.sync(basePayload);

        const rpcCalls = (client as any)._rpcCalls;
        expect(rpcCalls[1].fn).toBe("custom_link_rpc");
    });

    it("still succeeds when link_shadow_auth_user fails", async () => {
        const client = mockSupabaseClient({
            rpcResults: [
                { data: null, error: null },  // upsert_oidc_user
                { data: null, error: { message: "link failed" } },  // link_shadow_auth_user
            ],
        });
        const adapter = new SupabaseSyncAdapter(client, supabaseConfig);

        const result = await adapter.sync(basePayload);

        expect(result.synced).toBe(true);
        expect(result.authUserId).toBe("new-auth-id");
    });

    it("does not call link_shadow_auth_user when shadow user creation is disabled", async () => {
        const client = mockSupabaseClient();
        const config: SupabaseSyncConfig = { ...supabaseConfig, createShadowAuthUser: false };
        const adapter = new SupabaseSyncAdapter(client, config);

        await adapter.sync(basePayload);

        const rpcCalls = (client as any)._rpcCalls;
        expect(rpcCalls).toHaveLength(1);
        expect(rpcCalls[0].fn).toBe("upsert_oidc_user");
    });
});
