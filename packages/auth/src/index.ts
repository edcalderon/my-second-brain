export * from "./types";
export * from "./AuthProvider";
// Core exports the types and provider. Provider implementations are loaded from subpaths.

// Maintain backwards compatibility exports for v1.1.x
export * from "./providers/SupabaseClient";
export * from "./providers/FirebaseWebClient";
export { FirebaseWebClient as FirebaseClient } from "./providers/FirebaseWebClient";
export * from "./providers/HybridWebClient";
export { HybridWebClient as HybridClient } from "./providers/HybridWebClient";
export * from "./AuthentikOidcClient";
