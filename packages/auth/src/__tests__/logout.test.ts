/**
 * Tests for the Authentik logout orchestrator.
 */

import {
    revokeToken,
    buildEndSessionUrl,
    orchestrateLogout,
} from "../authentik/logout";
import type { AuthentikLogoutConfig } from "../authentik/types";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const baseConfig: AuthentikLogoutConfig = {
    issuer: "https://auth.example.com/application/o/my-app",
    postLogoutRedirectUri: "https://landing.example.com/?logged_out=1",
    endSessionEndpoint: "https://auth.example.com/application/o/my-app/end-session/",
    revocationEndpoint: "https://auth.example.com/application/o/revoke/",
};

function mockFetch(ok: boolean, status = 200): typeof fetch {
    return (async () => ({ ok, status } as Response)) as unknown as typeof fetch;
}

/* ------------------------------------------------------------------ */
/*  revokeToken                                                        */
/* ------------------------------------------------------------------ */

describe("revokeToken", () => {
    it("returns true on successful revocation", async () => {
        const config = { ...baseConfig, fetchFn: mockFetch(true) };
        const result = await revokeToken(config, "access-token");
        expect(result).toBe(true);
    });

    it("sends revocation request to the exact revocationEndpoint URL", async () => {
        let capturedUrl = "";
        const config: AuthentikLogoutConfig = {
            ...baseConfig,
            fetchFn: (async (input: RequestInfo | URL) => {
                capturedUrl = typeof input === "string" ? input : input.toString();
                return { ok: true, status: 200 } as Response;
            }) as unknown as typeof fetch,
        };
        await revokeToken(config, "access-token");
        expect(capturedUrl).toBe("https://auth.example.com/application/o/revoke/");
    });

    it("returns false on revocation failure", async () => {
        const config = { ...baseConfig, fetchFn: mockFetch(false, 400) };
        const result = await revokeToken(config, "access-token");
        expect(result).toBe(false);
    });

    it("returns false on network error (best-effort)", async () => {
        const config: AuthentikLogoutConfig = {
            ...baseConfig,
            fetchFn: (async () => {
                throw new Error("Network error");
            }) as unknown as typeof fetch,
        };
        const result = await revokeToken(config, "access-token");
        expect(result).toBe(false);
    });

    it("returns false when revocationEndpoint is not set", async () => {
        const config: AuthentikLogoutConfig = {
            ...baseConfig,
            revocationEndpoint: undefined,
            fetchFn: mockFetch(true),
        };
        const result = await revokeToken(config, "access-token");
        expect(result).toBe(false);
    });
});

/* ------------------------------------------------------------------ */
/*  buildEndSessionUrl                                                 */
/* ------------------------------------------------------------------ */

describe("buildEndSessionUrl", () => {
    it("builds end-session URL with id_token_hint", () => {
        const url = buildEndSessionUrl(baseConfig, "my-id-token");
        const parsed = new URL(url);

        expect(parsed.origin).toBe("https://auth.example.com");
        expect(parsed.pathname).toBe("/application/o/my-app/end-session/");
        expect(parsed.searchParams.get("id_token_hint")).toBe("my-id-token");
        expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe(
            "https://landing.example.com/?logged_out=1",
        );
    });

    it("builds end-session URL without id_token_hint", () => {
        const url = buildEndSessionUrl(baseConfig);
        const parsed = new URL(url);

        expect(parsed.searchParams.has("id_token_hint")).toBe(false);
        expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe(
            "https://landing.example.com/?logged_out=1",
        );
    });

    it("uses the exact endSessionEndpoint URL", () => {
        const config: AuthentikLogoutConfig = {
            ...baseConfig,
            endSessionEndpoint: "https://auth.example.com/custom/logout/",
        };
        const url = buildEndSessionUrl(config, "token");
        expect(url).toContain("https://auth.example.com/custom/logout/");
    });
});

/* ------------------------------------------------------------------ */
/*  orchestrateLogout                                                  */
/* ------------------------------------------------------------------ */

describe("orchestrateLogout", () => {
    it("revokes token and builds end-session URL", async () => {
        const config = { ...baseConfig, fetchFn: mockFetch(true) };
        const result = await orchestrateLogout(config, {
            accessToken: "at",
            idToken: "it",
        });

        expect(result.tokenRevoked).toBe(true);
        expect(result.endSessionUrl).toContain("/application/o/my-app/end-session/");
        expect(result.endSessionUrl).toContain("id_token_hint=it");
    });

    it("still builds end-session URL when revocation fails", async () => {
        const config = { ...baseConfig, fetchFn: mockFetch(false) };
        const result = await orchestrateLogout(config, {
            accessToken: "at",
            idToken: "it",
        });

        expect(result.tokenRevoked).toBe(false);
        expect(result.endSessionUrl).toContain("/application/o/my-app/end-session/");
    });

    it("skips revocation when no access token is provided", async () => {
        let fetchCalled = false;
        const config: AuthentikLogoutConfig = {
            ...baseConfig,
            fetchFn: (async () => {
                fetchCalled = true;
                return { ok: true, status: 200 } as Response;
            }) as unknown as typeof fetch,
        };

        const result = await orchestrateLogout(config, { idToken: "it" });

        expect(fetchCalled).toBe(false);
        expect(result.tokenRevoked).toBe(false);
        expect(result.endSessionUrl).toContain("/application/o/my-app/end-session/");
    });
});
