/**
 * Public entry point for @workspace/api-client-react.
 *
 * All types, hooks, and utilities are re-exported here.
 * Always import from "@workspace/api-client-react" — never from deep paths
 * like "@workspace/api-client-react/src/generated/...". Deep imports bypass
 * this barrel and will break if generated filenames or locations ever change.
 *
 * The `export *` lines below automatically pick up every new type added by
 * codegen, so there is no need to manually list individual exports.
 */
export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
