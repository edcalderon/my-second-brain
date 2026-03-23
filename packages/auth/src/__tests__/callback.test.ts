/**
 * Tests for the enhanced Authentik callback handler.
 */

import {
    exchangeCode,
    fetchClaims,
    processCallback,
} from "../authentik/callback";
import type {
    AuthentikCallbackConfig,
    AuthentikTokenResponse,
    AuthentikClaims,
    ProvisioningAdapter,
    ProvisioningPayload,
    ProvisioningResult,
} from "../authentik/types";
import type { ProcessCallbackOptions } from "../authentik/callback";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const baseConfig: AuthentikCallbackConfig = {
    issuer: "https://auth.example.com/application/o/my-app",
    clientId: "test-client-id",
    redirectUri: "https://dashboard.example.com/auth/callback",
    tokenEndpoint: "https://auth.example.com/application/o/token/",
    userinfoEndpoint: "https://auth.example.com/application/o/userinfo/",
};

function mockFetch(responses: Array<{ ok: boolean; status: number; json: unknown }>): typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> } {
    let callIndex = 0;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        calls.push({ url, init });
        const resp = responses[callIndex++] || { ok: false, status: 500, json: {} };
        return {
            ok: resp.ok,
            status: resp.status,
            json: async () => resp.json,
        } as Response;
    }) as unknown as typeof fetch & { calls: Array<{ url: string; init?: RequestInit }> };
    (fn as any).calls = calls;
    return fn as any;
}

/* ------------------------------------------------------------------ */
/*  exchangeCode                                                       */
/* ------------------------------------------------------------------ */

describe("exchangeCode", () => {
    it("exchanges code for tokens successfully", async () => {
        const tokenResponse: AuthentikTokenResponse = {
            access_token: "at_123",
            token_type: "Bearer",
            refresh_token: "rt_456",
            id_token: "id_789",
            expires_in: 3600,
            scope: "openid profile email",
        };

        const fetchFn = mockFetch([{ ok: true, status: 200, json: tokenResponse }]);
        const config = { ...baseConfig, fetchFn };

        const result = await exchangeCode(config, "auth-code", "verifier");

        expect(result.access_token).toBe("at_123");
        expect(result.refresh_token).toBe("rt_456");
        expect(result.id_token).toBe("id_789");
        expect(result.expires_in).toBe(3600);
    });

    it("sends token request to the exact tokenEndpoint URL", async () => {
        const tokenResponse: AuthentikTokenResponse = {
            access_token: "at_123",
        };

        const fetchFn = mockFetch([{ ok: true, status: 200, json: tokenResponse }]);
        const config = { ...baseConfig, fetchFn };

        await exchangeCode(config, "auth-code", "verifier");

        expect(fetchFn.calls[0].url).toBe("https://auth.example.com/application/o/token/");
    });

    it("throws on non-OK response", async () => {
        const fetchFn = mockFetch([{ ok: false, status: 400, json: {} }]);
        const config = { ...baseConfig, fetchFn };

        await expect(exchangeCode(config, "bad-code", "verifier")).rejects.toThrow(
            "NETWORK_ERROR: Token exchange failed (HTTP 400)",
        );
    });

    it("throws when access_token is missing", async () => {
        const fetchFn = mockFetch([{ ok: true, status: 200, json: {} }]);
        const config = { ...baseConfig, fetchFn };

        await expect(exchangeCode(config, "code", "verifier")).rejects.toThrow(
            "SESSION_ERROR: Token response missing access_token",
        );
    });
});

/* ------------------------------------------------------------------ */
/*  fetchClaims                                                        */
/* ------------------------------------------------------------------ */

describe("fetchClaims", () => {
    it("fetches and returns OIDC claims", async () => {
        const claims: AuthentikClaims = {
            sub: "user-sub-123",
            iss: "https://auth.example.com/application/o/my-app",
            email: "user@example.com",
            email_verified: true,
            name: "Test User",
        };

        const fetchFn = mockFetch([{ ok: true, status: 200, json: claims }]);
        const config = { ...baseConfig, fetchFn };

        const result = await fetchClaims(config, "at_123");

        expect(result.sub).toBe("user-sub-123");
        expect(result.email).toBe("user@example.com");
    });

    it("sends userinfo request to the exact userinfoEndpoint URL", async () => {
        const claims: AuthentikClaims = {
            sub: "user-sub-123",
            iss: "https://auth.example.com/application/o/my-app",
        };

        const fetchFn = mockFetch([{ ok: true, status: 200, json: claims }]);
        const config = { ...baseConfig, fetchFn };

        await fetchClaims(config, "at_123");

        expect(fetchFn.calls[0].url).toBe("https://auth.example.com/application/o/userinfo/");
    });

    it("throws on non-OK response", async () => {
        const fetchFn = mockFetch([{ ok: false, status: 401, json: {} }]);
        const config = { ...baseConfig, fetchFn };

        await expect(fetchClaims(config, "bad-token")).rejects.toThrow(
            "NETWORK_ERROR: Userinfo request failed (HTTP 401)",
        );
    });

    it("throws when required claims are missing", async () => {
        const fetchFn = mockFetch([{ ok: true, status: 200, json: { email: "a@b.com" } }]);
        const config = { ...baseConfig, fetchFn };

        await expect(fetchClaims(config, "at")).rejects.toThrow(
            "SESSION_ERROR: Userinfo response missing required claims (sub, iss)",
        );
    });
});

/* ------------------------------------------------------------------ */
/*  processCallback                                                    */
/* ------------------------------------------------------------------ */

describe("processCallback", () => {
    const tokenResponse: AuthentikTokenResponse = {
        access_token: "at_123",
        id_token: "id_789",
        expires_in: 3600,
    };

    const claims: AuthentikClaims = {
        sub: "user-sub-123",
        iss: "https://auth.example.com/application/o/my-app",
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
    };

    function buildOptions(overrides?: Partial<ProcessCallbackOptions>): ProcessCallbackOptions {
        const fetchFn = mockFetch([
            { ok: true, status: 200, json: tokenResponse },
            { ok: true, status: 200, json: claims },
        ]);

        return {
            config: { ...baseConfig, fetchFn },
            code: "auth-code",
            codeVerifier: "verifier",
            state: "valid-state",
            expectedState: "valid-state",
            provider: "google",
            ...overrides,
        };
    }

    it("succeeds without provisioning adapter", async () => {
        const result = await processCallback(buildOptions());

        expect(result.success).toBe(true);
        expect(result.callbackResult?.tokens.access_token).toBe("at_123");
        expect(result.callbackResult?.claims.sub).toBe("user-sub-123");
        expect(result.callbackResult?.provider).toBe("google");
        expect(result.provisioningResult).toBeUndefined();
    });

    it("fails on state mismatch", async () => {
        const result = await processCallback(
            buildOptions({ expectedState: "wrong-state" }),
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("state_mismatch");
    });

    it("fails when token exchange fails", async () => {
        const fetchFn = mockFetch([{ ok: false, status: 500, json: {} }]);
        const result = await processCallback(
            buildOptions({ config: { ...baseConfig, fetchFn } }),
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("token_exchange_failed");
    });

    it("fails when userinfo fails", async () => {
        const fetchFn = mockFetch([
            { ok: true, status: 200, json: tokenResponse },
            { ok: false, status: 401, json: {} },
        ]);
        const result = await processCallback(
            buildOptions({ config: { ...baseConfig, fetchFn } }),
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("userinfo_failed");
    });

    it("blocks on provisioning adapter and succeeds", async () => {
        const adapter: ProvisioningAdapter = {
            sync: async (payload: ProvisioningPayload): Promise<ProvisioningResult> => {
                expect(payload.sub).toBe("user-sub-123");
                expect(payload.email).toBe("user@example.com");
                return { synced: true, appUserId: "app-user-1" };
            },
        };

        const result = await processCallback(
            buildOptions({ provisioningAdapter: adapter }),
        );

        expect(result.success).toBe(true);
        expect(result.provisioningResult?.synced).toBe(true);
        expect(result.provisioningResult?.appUserId).toBe("app-user-1");
    });

    it("fails when provisioning adapter returns synced: false", async () => {
        const adapter: ProvisioningAdapter = {
            sync: async (): Promise<ProvisioningResult> => ({
                synced: false,
                error: "Supabase unavailable",
                errorCode: "supabase_not_configured",
            }),
        };

        const result = await processCallback(
            buildOptions({ provisioningAdapter: adapter }),
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("supabase_not_configured");
        expect(result.callbackResult).toBeDefined(); // tokens were still obtained
    });

    it("fails when provisioning adapter throws", async () => {
        const adapter: ProvisioningAdapter = {
            sync: async () => {
                throw new Error("Database connection failed");
            },
        };

        const result = await processCallback(
            buildOptions({ provisioningAdapter: adapter }),
        );

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe("provisioning_error");
        expect(result.error).toBe("Database connection failed");
    });
});
