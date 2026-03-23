/**
 * Tests for config validation / doctor helpers.
 */

import {
    validateAuthentikConfig,
    validateSupabaseSyncConfig,
    validateFullConfig,
    discoverEndpoints,
} from "../authentik/config";

/* ------------------------------------------------------------------ */
/*  validateAuthentikConfig                                            */
/* ------------------------------------------------------------------ */

describe("validateAuthentikConfig", () => {
    it("passes with valid config", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com/application/o/my-app",
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
            tokenEndpoint: "https://auth.example.com/application/o/token/",
            userinfoEndpoint: "https://auth.example.com/application/o/userinfo/",
        });

        expect(result.valid).toBe(true);
        expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it("fails when issuer is missing", () => {
        const result = validateAuthentikConfig({
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const issuerCheck = result.checks.find((c) => c.name === "issuer");
        expect(issuerCheck?.passed).toBe(false);
        expect(issuerCheck?.message).toContain("required");
    });

    it("fails when issuer is not a valid URL", () => {
        const result = validateAuthentikConfig({
            issuer: "not-a-url",
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const issuerCheck = result.checks.find((c) => c.name === "issuer");
        expect(issuerCheck?.passed).toBe(false);
        expect(issuerCheck?.message).toContain("not a valid URL");
    });

    it("fails when clientId is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "clientId");
        expect(check?.passed).toBe(false);
    });

    it("fails when redirectUri is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "redirectUri");
        expect(check?.passed).toBe(false);
    });

    it("fails when redirectUri is not a valid URL", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
            redirectUri: "invalid",
        });

        expect(result.valid).toBe(false);
    });

    it("fails when all fields are missing", () => {
        const result = validateAuthentikConfig({});
        expect(result.valid).toBe(false);
        expect(result.checks.filter((c) => !c.passed)).toHaveLength(5);
    });

    it("fails when tokenEndpoint is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
            redirectUri: "https://app.example.com/callback",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "tokenEndpoint");
        expect(check?.passed).toBe(false);
        expect(check?.message).toContain("discoverEndpoints");
    });

    it("fails when userinfoEndpoint is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
            redirectUri: "https://app.example.com/callback",
            tokenEndpoint: "https://auth.example.com/application/o/token/",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "userinfoEndpoint");
        expect(check?.passed).toBe(false);
    });
});

/* ------------------------------------------------------------------ */
/*  validateSupabaseSyncConfig                                         */
/* ------------------------------------------------------------------ */

describe("validateSupabaseSyncConfig", () => {
    it("passes with valid config", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(true);
    });

    it("fails when supabaseUrl is missing", () => {
        const result = validateSupabaseSyncConfig({
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "supabaseUrl");
        expect(check?.passed).toBe(false);
        expect(check?.message).toContain("supabase_not_configured");
    });

    it("fails when service role key is missing", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "supabaseServiceRoleKey");
        expect(check?.passed).toBe(false);
        expect(check?.message).toContain("supabase_not_configured");
    });

    it("warns when service role key appears too short", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
            supabaseServiceRoleKey: "short",
        });

        // Short key is a warning, not an error
        const check = result.checks.find((c) => c.name === "supabaseServiceRoleKey");
        expect(check?.passed).toBe(false);
        expect(check?.severity).toBe("warning");
    });

    it("fails when supabaseUrl is not a valid URL", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "not-a-url",
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(false);
    });
});

/* ------------------------------------------------------------------ */
/*  validateFullConfig                                                 */
/* ------------------------------------------------------------------ */

describe("validateFullConfig", () => {
    it("passes when both configs are valid", () => {
        const result = validateFullConfig(
            {
                issuer: "https://auth.example.com",
                clientId: "client",
                redirectUri: "https://app.example.com/callback",
                tokenEndpoint: "https://auth.example.com/application/o/token/",
                userinfoEndpoint: "https://auth.example.com/application/o/userinfo/",
            },
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        expect(result.valid).toBe(true);
    });

    it("fails when authentik config is invalid", () => {
        const result = validateFullConfig(
            {},
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        expect(result.valid).toBe(false);
    });

    it("combines checks from both configs", () => {
        const result = validateFullConfig(
            {
                issuer: "https://auth.example.com",
                clientId: "client",
                redirectUri: "https://app.example.com/callback",
                tokenEndpoint: "https://auth.example.com/application/o/token/",
                userinfoEndpoint: "https://auth.example.com/application/o/userinfo/",
            },
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        // 5 authentik checks + 2 supabase checks = 7 minimum
        expect(result.checks.length).toBeGreaterThanOrEqual(7);
    });
});

/* ------------------------------------------------------------------ */
/*  discoverEndpoints                                                  */
/* ------------------------------------------------------------------ */

describe("discoverEndpoints", () => {
    function mockFetch(doc: Record<string, unknown>, ok = true, status = 200): typeof fetch {
        return (async () => ({
            ok,
            status,
            json: async () => doc,
        })) as unknown as typeof fetch;
    }

    const wellKnownDoc = {
        issuer: "https://auth.example.com/application/o/my-app/",
        authorization_endpoint: "https://auth.example.com/application/o/authorize/",
        token_endpoint: "https://auth.example.com/application/o/token/",
        userinfo_endpoint: "https://auth.example.com/application/o/userinfo/",
        revocation_endpoint: "https://auth.example.com/application/o/revoke/",
        end_session_endpoint: "https://auth.example.com/application/o/my-app/end-session/",
    };

    it("discovers endpoints from .well-known/openid-configuration", async () => {
        const endpoints = await discoverEndpoints(
            "https://auth.example.com/application/o/my-app/",
            mockFetch(wellKnownDoc),
        );

        expect(endpoints.authorization).toBe("https://auth.example.com/application/o/authorize/");
        expect(endpoints.token).toBe("https://auth.example.com/application/o/token/");
        expect(endpoints.userinfo).toBe("https://auth.example.com/application/o/userinfo/");
        expect(endpoints.revocation).toBe("https://auth.example.com/application/o/revoke/");
        expect(endpoints.endSession).toBe("https://auth.example.com/application/o/my-app/end-session/");
    });

    it("appends trailing slash to issuer before building .well-known URL", async () => {
        let capturedUrl = "";
        const fetchFn = (async (input: RequestInfo | URL) => {
            capturedUrl = typeof input === "string" ? input : input.toString();
            return { ok: true, status: 200, json: async () => wellKnownDoc } as Response;
        }) as unknown as typeof fetch;

        await discoverEndpoints("https://auth.example.com/application/o/my-app", fetchFn);

        expect(capturedUrl).toBe(
            "https://auth.example.com/application/o/my-app/.well-known/openid-configuration",
        );
    });

    it("throws on non-OK response", async () => {
        await expect(
            discoverEndpoints(
                "https://auth.example.com/application/o/my-app/",
                mockFetch({}, false, 404),
            ),
        ).rejects.toThrow("Failed to fetch .well-known/openid-configuration");
    });

    it("throws when required endpoints are missing", async () => {
        await expect(
            discoverEndpoints(
                "https://auth.example.com/application/o/my-app/",
                mockFetch({ issuer: "https://auth.example.com" }),
            ),
        ).rejects.toThrow("missing required endpoints");
    });

    it("returns undefined for optional endpoints when absent", async () => {
        const minimalDoc = {
            authorization_endpoint: "https://auth.example.com/application/o/authorize/",
            token_endpoint: "https://auth.example.com/application/o/token/",
            userinfo_endpoint: "https://auth.example.com/application/o/userinfo/",
        };

        const endpoints = await discoverEndpoints(
            "https://auth.example.com/application/o/my-app/",
            mockFetch(minimalDoc),
        );

        expect(endpoints.revocation).toBeUndefined();
        expect(endpoints.endSession).toBeUndefined();
    });
});
