import {
    createRelayPageHtml,
    parseRelayParams,
} from "./relay";
import { processCallback, type ProcessCallbackResult } from "./callback";
import { orchestrateLogout } from "./logout";
import {
    validateAuthentikConfig,
    validateFullConfig,
} from "./config";
import { createSupabaseSyncAdapter } from "./provisioning";
import type {
    AuthentikCallbackConfig,
    AuthentikLogoutConfig,
    AuthentikRelayConfig,
    ProvisioningAdapter,
    SupabaseSyncConfig,
    ConfigValidationResult,
} from "./types";

export interface AuthentikPresetConfig {
    relay: AuthentikRelayConfig;
    callback: AuthentikCallbackConfig;
    logout: AuthentikLogoutConfig;
    provisioningAdapter?: ProvisioningAdapter;
}

export interface CreateAuthentikPresetOptions {
    relay: AuthentikRelayConfig;
    callback: AuthentikCallbackConfig;
    logout: AuthentikLogoutConfig;
    provisioningAdapter?: ProvisioningAdapter;
    supabaseSync?: SupabaseSyncConfig;
}

export interface AuthentikPreset {
    config: AuthentikPresetConfig;
    validateConfig(): ConfigValidationResult;
}

export interface HandleAuthentikCallbackInput {
    code: string;
    codeVerifier: string;
    state: string;
    expectedState: string;
    provider: string;
}

export type AuthentikRelayHandler = (
    searchParams: URLSearchParams | Record<string, string | undefined>,
) => { ok: true; html: string } | { ok: false; error: string; errorCode: string };

export function createAuthentikRelayHandler(
    config: AuthentikRelayConfig,
): AuthentikRelayHandler {
    return (searchParams) => {
        const params = parseRelayParams(searchParams);
        if (!params) {
            return {
                ok: false,
                error: "Missing required relay parameters",
                errorCode: "relay_params_missing",
            };
        }

        const result = createRelayPageHtml(config, params);
        return { ok: true, html: result.html };
    };
}

export function handleAuthentikCallback(
    preset: AuthentikPreset,
    input: HandleAuthentikCallbackInput,
): Promise<ProcessCallbackResult> {
    return processCallback({
        config: preset.config.callback,
        code: input.code,
        codeVerifier: input.codeVerifier,
        state: input.state,
        expectedState: input.expectedState,
        provider: input.provider,
        provisioningAdapter: preset.config.provisioningAdapter,
    });
}

export function createAuthentikLogoutHandler(
    config: AuthentikLogoutConfig,
): (tokens: { accessToken?: string; idToken?: string }) => ReturnType<typeof orchestrateLogout> {
    return (tokens) => orchestrateLogout(config, tokens);
}

export function createAuthentikPreset(
    options: CreateAuthentikPresetOptions,
): AuthentikPreset {
    const provisioningAdapter =
        options.provisioningAdapter ||
        (options.supabaseSync
            ? createSupabaseSyncAdapter(options.supabaseSync)
            : undefined);

    const presetConfig: AuthentikPresetConfig = {
        relay: options.relay,
        callback: options.callback,
        logout: options.logout,
        provisioningAdapter,
    };

    return {
        config: presetConfig,
        validateConfig: () => {
            if (options.supabaseSync) {
                return validateFullConfig(options.callback, options.supabaseSync);
            }

            return validateAuthentikConfig(options.callback);
        },
    };
}
