import {
    createAuthentikPreset,
    createAuthentikRelayHandler,
    createAuthentikLogoutHandler,
    handleAuthentikCallback,
} from "../authentik/preset";
import type {
    AuthentikRelayConfig,
    AuthentikCallbackConfig,
    AuthentikLogoutConfig,
    ProvisioningAdapter,
    ProvisioningPayload,
} from "../authentik/types";

const relayConfig: AuthentikRelayConfig = {
    issuer: "https://auth.example.com/application/o/my-app/",
    clientId: "client-id",
    redirectUri: "https://dashboard.example.com/auth/callback",
    authorizePath: "https://auth.example.com/application/o/authorize/",
};

const callbackConfig: AuthentikCallbackConfig = {
    issuer: "https://auth.example.com/application/o/my-app/",
    clientId: "client-id",
    redirectUri: "https://dashboard.example.com/auth/callback",
    tokenEndpoint: "https://auth.example.com/application/o/token/",
    userinfoEndpoint: "https://auth.example.com/application/o/userinfo/",
};

const logoutConfig: AuthentikLogoutConfig = {
    issuer: "https://auth.example.com/application/o/my-app/",
    postLogoutRedirectUri: "https://landing.example.com/",
    endSessionEndpoint: "https://auth.example.com/application/o/my-app/end-session/",
};

describe("createAuthentikRelayHandler", () => {
    it("returns an error when params are missing", () => {
        const handler = createAuthentikRelayHandler(relayConfig);
        const result = handler(new URLSearchParams());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errorCode).toBe("relay_params_missing");
        }
    });

    it("returns HTML when relay params are valid", () => {
        const handler = createAuthentikRelayHandler(relayConfig);
        const result = handler(
            new URLSearchParams({
                provider: "google",
                code_verifier: "verifier",
                code_challenge: "challenge",
                state: "state-token",
            }),
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.html).toContain("sessionStorage");
            expect(result.html).toContain("/source/oauth/login/google/");
        }
    });
});

describe("createAuthentikPreset + callback/logout handlers", () => {
    const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.includes("/token/")) {
            return {
                ok: true,
                json: async () => ({ access_token: "access-123", id_token: "id-123" }),
            } as Response;
        }

        if (url.includes("/userinfo/")) {
            return {
                ok: true,
                json: async () => ({
                    sub: "sub-123",
                    iss: "https://auth.example.com/application/o/my-app/",
                    email: "USER@EXAMPLE.COM",
                }),
            } as Response;
        }

        return { ok: true, json: async () => ({}) } as Response;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    it("creates a preset and validates config", () => {
        const preset = createAuthentikPreset({
            relay: relayConfig,
            callback: callbackConfig,
            logout: logoutConfig,
        });

        const validation = preset.validateConfig();
        expect(validation.valid).toBe(true);
        expect(validation.checks.length).toBeGreaterThan(0);
    });

    it("uses preset config in handleAuthentikCallback", async () => {
        const adapter: ProvisioningAdapter = {
            sync: async (payload: ProvisioningPayload) => {
                expect(payload.email).toBe("user@example.com");
                return { synced: true, appUserId: "app-user-1" };
            },
        };

        const preset = createAuthentikPreset({
            relay: relayConfig,
            callback: { ...callbackConfig, fetchFn: mockFetch as unknown as typeof fetch },
            logout: logoutConfig,
            provisioningAdapter: adapter,
        });

        const result = await handleAuthentikCallback(preset, {
            code: "code-123",
            codeVerifier: "verifier",
            state: "state-1",
            expectedState: "state-1",
            provider: "google",
        });

        expect(result.success).toBe(true);
        expect(result.provisioningResult?.synced).toBe(true);
    });

    it("creates a logout handler bound to config", async () => {
        const fetchFn = jest.fn(async () => ({ ok: true } as Response));
        const handler = createAuthentikLogoutHandler({
            ...logoutConfig,
            revocationEndpoint: "https://auth.example.com/application/o/revoke/",
            clientId: "client-id",
            fetchFn: fetchFn as unknown as typeof fetch,
        });

        const result = await handler({ accessToken: "at-1", idToken: "id-1" });

        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result.tokenRevoked).toBe(true);
        expect(result.endSessionUrl).toContain("post_logout_redirect_uri=");
    });
});