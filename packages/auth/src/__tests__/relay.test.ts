/**
 * Tests for the cross-origin PKCE relay handler.
 */

import {
    createRelayPageHtml,
    parseRelayParams,
    readRelayStorage,
    clearRelayStorage,
} from "../authentik/relay";
import type { AuthentikRelayConfig, RelayIncomingParams } from "../authentik/types";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const baseConfig: AuthentikRelayConfig = {
    issuer: "https://auth.example.com/application/o/my-app",
    clientId: "test-client-id",
    redirectUri: "https://dashboard.example.com/auth/callback",
    authorizePath: "https://auth.example.com/application/o/authorize/",
};

const baseParams: RelayIncomingParams = {
    provider: "google",
    codeVerifier: "test-verifier-abc123",
    codeChallenge: "test-challenge-xyz789",
    state: "random-state-token",
};

/* ------------------------------------------------------------------ */
/*  createRelayPageHtml                                                */
/* ------------------------------------------------------------------ */

describe("createRelayPageHtml", () => {
    it("returns an HTML string with sessionStorage writes", () => {
        const result = createRelayPageHtml(baseConfig, baseParams);

        expect(result.html).toContain("<!DOCTYPE html>");
        expect(result.html).toContain("sessionStorage");
        expect(result.html).toContain("authentik_relay:verifier");
        expect(result.html).toContain("test-verifier-abc123");
        expect(result.html).toContain("authentik_relay:state");
        expect(result.html).toContain("random-state-token");
        expect(result.html).toContain("authentik_relay:provider");
        expect(result.html).toContain("google");
    });

    it("includes the Authentik flow URL for the provider", () => {
        const result = createRelayPageHtml(baseConfig, baseParams);

        // Default: /source/oauth/login/{provider}/
        expect(result.html).toContain("/source/oauth/login/google/");
        expect(result.html).toContain("window.location.replace");
    });

    it("uses providerFlowSlugs when configured", () => {
        const config: AuthentikRelayConfig = {
            ...baseConfig,
            providerFlowSlugs: { google: "my-app-google-login" },
        };
        const result = createRelayPageHtml(config, baseParams);

        expect(result.html).toContain("/if/flow/my-app-google-login/");
    });

    it("stores the next parameter when provided", () => {
        const params: RelayIncomingParams = {
            ...baseParams,
            next: "/dashboard",
        };
        const result = createRelayPageHtml(baseConfig, params);

        expect(result.html).toContain("authentik_relay:next");
        expect(result.html).toContain("/dashboard");
    });

    it("does not include next key when next is not provided", () => {
        const result = createRelayPageHtml(baseConfig, baseParams);
        expect(result.html).not.toContain("authentik_relay:next");
    });

    it("embeds the OIDC authorize URL with PKCE params at the correct endpoint", () => {
        const result = createRelayPageHtml(baseConfig, baseParams);

        // The authorize URL is embedded inside the flow URL's ?next= param,
        // so slashes appear URL-encoded as %2F in the HTML output.
        expect(result.html).toContain("application%2Fo%2Fauthorize%2F");
        // It must NOT use the issuer app path as a prefix for authorize
        expect(result.html).not.toContain("application%2Fo%2Fmy-app%2Fauthorize");
        expect(result.html).toContain("response_type%3Dcode");
        expect(result.html).toContain("client_id%3Dtest-client-id");
        expect(result.html).toContain("code_challenge%3Dtest-challenge-xyz789");
        expect(result.html).toContain("code_challenge_method%3DS256");
    });

    it("uses custom storageKeyPrefix", () => {
        const config: AuthentikRelayConfig = {
            ...baseConfig,
            storageKeyPrefix: "myapp_pkce",
        };
        const result = createRelayPageHtml(config, baseParams);

        expect(result.html).toContain("myapp_pkce:verifier");
        expect(result.html).toContain("myapp_pkce:state");
    });

    it("escapes HTML-unsafe characters in JSON values", () => {
        const params: RelayIncomingParams = {
            ...baseParams,
            codeVerifier: "verifier<script>alert(1)</script>",
        };
        const result = createRelayPageHtml(baseConfig, params);

        // Should be escaped as \u003c / \u003e
        expect(result.html).not.toContain("<script>alert(1)</script>");
        expect(result.html).toContain("\\u003cscript\\u003e");
    });
});

/* ------------------------------------------------------------------ */
/*  parseRelayParams                                                   */
/* ------------------------------------------------------------------ */

describe("parseRelayParams", () => {
    it("parses valid URLSearchParams", () => {
        const params = new URLSearchParams({
            provider: "github",
            code_verifier: "abc",
            code_challenge: "xyz",
            state: "s123",
        });

        const result = parseRelayParams(params);
        expect(result).toEqual({
            provider: "github",
            codeVerifier: "abc",
            codeChallenge: "xyz",
            state: "s123",
            next: undefined,
        });
    });

    it("parses a plain Record", () => {
        const result = parseRelayParams({
            provider: "google",
            code_verifier: "v",
            code_challenge: "c",
            state: "s",
            next: "/home",
        });

        expect(result).toEqual({
            provider: "google",
            codeVerifier: "v",
            codeChallenge: "c",
            state: "s",
            next: "/home",
        });
    });

    it("returns null when required params are missing", () => {
        expect(parseRelayParams(new URLSearchParams({}))).toBeNull();
        expect(
            parseRelayParams({
                provider: "google",
                code_verifier: "v",
                // missing code_challenge and state
            }),
        ).toBeNull();
    });
});

/* ------------------------------------------------------------------ */
/*  readRelayStorage / clearRelayStorage                               */
/* ------------------------------------------------------------------ */

describe("readRelayStorage / clearRelayStorage", () => {
    let storage: Storage;

    beforeEach(() => {
        const store: Record<string, string> = {};
        storage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
            get length() { return Object.keys(store).length; },
            key: (index: number) => Object.keys(store)[index] ?? null,
        };
    });

    it("returns null when storage is empty", () => {
        expect(readRelayStorage(storage)).toBeNull();
    });

    it("reads stored relay params", () => {
        storage.setItem("authentik_relay:verifier", "v1");
        storage.setItem("authentik_relay:state", "s1");
        storage.setItem("authentik_relay:provider", "google");
        storage.setItem("authentik_relay:next", "/dash");

        const result = readRelayStorage(storage);
        expect(result).toEqual({
            codeVerifier: "v1",
            state: "s1",
            provider: "google",
            next: "/dash",
        });
    });

    it("reads with custom prefix", () => {
        storage.setItem("myapp:verifier", "v2");
        storage.setItem("myapp:state", "s2");
        storage.setItem("myapp:provider", "github");

        const result = readRelayStorage(storage, "myapp");
        expect(result).toEqual({
            codeVerifier: "v2",
            state: "s2",
            provider: "github",
            next: undefined,
        });
    });

    it("clears stored relay params", () => {
        storage.setItem("authentik_relay:verifier", "v1");
        storage.setItem("authentik_relay:state", "s1");
        storage.setItem("authentik_relay:provider", "google");
        storage.setItem("authentik_relay:next", "/dash");

        clearRelayStorage(storage);

        expect(storage.getItem("authentik_relay:verifier")).toBeNull();
        expect(storage.getItem("authentik_relay:state")).toBeNull();
        expect(storage.getItem("authentik_relay:provider")).toBeNull();
        expect(storage.getItem("authentik_relay:next")).toBeNull();
    });
});
