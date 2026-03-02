import { generateCSP } from "@lib/cspScripts";

/**
 * Base Content Security Policy without nonce
 * Used as fallback/default when dynamic CSP generation is not available
 */
const BASE_CSP = `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; connect-src 'self'; block-all-mixed-content; upgrade-insecure-requests;`;

/**
 * Default CSP - uses BASE_CSP for backward compatibility
 */
export const DEFAULT_CSP = BASE_CSP;

export { generateCSP };
