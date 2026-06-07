// Node entry for the fjson-fmt library (conditional "node" export).
// The Node WASM build loads synchronously, so init() is a no-op and the sync
// and async APIs are both available immediately.
import { format as fmt, engineVersion as ver } from "./engine.mjs";

/**
 * Initialize the engine. No-op on Node (the WASM is loaded synchronously on
 * import); provided for a uniform API with the browser build.
 * @returns {Promise<void>}
 */
export async function init() {}

/**
 * Format a JSON string synchronously.
 * @param {string} input
 * @param {Record<string, unknown>} [options] canonical snake_case overrides
 * @returns {string}
 */
export function formatSync(input, options = {}) {
  return fmt(input, options);
}

/**
 * Format a JSON string. Async for parity with the browser build.
 * @param {string} input
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<string>}
 */
export async function format(input, options = {}) {
  return fmt(input, options);
}

/** @returns {string} engine + vendored upstream version */
export function engineVersion() {
  return ver();
}
