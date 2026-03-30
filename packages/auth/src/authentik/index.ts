/**
 * @edcalderon/auth — Authentik flow + provisioning kit.
 *
 * Barrel export that assembles all Authentik-specific modules into a
 * single importable surface area.
 *
 * Usage:
 *   import { processCallback, orchestrateLogout, ... } from "@edcalderon/auth/authentik";
 */

// Types
export type {
    AuthentikProvider,
    AuthentikEndpoints,
    AuthentikRelayConfig,
    RelayIncomingParams,
    RelayHandlerResult,
    AuthentikCallbackConfig,
    AuthentikTokenResponse,
    AuthentikClaims,
    AuthentikCallbackResult,
    AuthentikLogoutConfig,
    AuthentikLogoutResult,
    ProvisioningPayload,
    ProvisioningResult,
    ProvisioningAdapter,
    SupabaseSyncConfig,
    ConfigValidationResult,
    ConfigCheck,
    SafeRedirectConfig,
} from "./types";

// Relay
export {
    createRelayPageHtml,
    parseRelayParams,
    readRelayStorage,
    clearRelayStorage,
} from "./relay";

// Callback
export {
    exchangeCode,
    fetchClaims,
    processCallback,
} from "./callback";
export type {
    ProcessCallbackOptions,
    ProcessCallbackResult,
} from "./callback";

// Logout
export {
    revokeToken,
    buildEndSessionUrl,
    orchestrateLogout,
} from "./logout";

// Provisioning
export {
    NoopProvisioningAdapter,
    createProvisioningAdapter,
    normalizePayload,
    SupabaseSyncAdapter,
    createSupabaseSyncAdapter,
} from "./provisioning";

// Config validation
export {
    validateAuthentikConfig,
    validateSupabaseSyncConfig,
    validateFullConfig,
    discoverEndpoints,
} from "./config";

// Safe redirect
export { resolveSafeRedirect } from "./redirect";

// Preset helpers
export {
    createAuthentikPreset,
    createAuthentikRelayHandler,
    createAuthentikLogoutHandler,
    handleAuthentikCallback,
} from "./preset";
export type {
    AuthentikPreset,
    AuthentikPresetConfig,
    CreateAuthentikPresetOptions,
    HandleAuthentikCallbackInput,
    AuthentikRelayHandler,
} from "./preset";
