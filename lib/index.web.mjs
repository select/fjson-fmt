// Browser/bundler entry for the fjson-fmt library (conditional "browser" /
// "default" export). The web WASM build must be initialized once before use;
// the generated glue resolves the .wasm via `new URL(..., import.meta.url)`,
// which bundlers (Vite, webpack 5, Rollup) and native ESM both understand.
import wbgInit, { format as wbgFormat, engine_version } from "../pkg-web/fjson_fmt_engine.js";

let readyPromise;
let initialized = false;

/**
 * Initialize the WASM engine. Idempotent — safe to call repeatedly.
 * @param {RequestInfo | URL | WebAssembly.Module} [moduleOrPath] optional
 *   override for where/how to load the .wasm (defaults to the bundled file).
 * @returns {Promise<void>}
 */
export function init(moduleOrPath) {
  if (!readyPromise) {
    readyPromise = wbgInit(moduleOrPath).then(() => {
      initialized = true;
    });
  }
  return readyPromise;
}

/**
 * Format a JSON string synchronously. Requires a prior `await init()`.
 * @param {string} input
 * @param {Record<string, unknown>} [options] canonical snake_case overrides
 * @returns {string}
 */
export function formatSync(input, options = {}) {
  if (!initialized) {
    throw new Error("fjson-fmt: call `await init()` before `formatSync()` in the browser");
  }
  return wbgFormat(input, JSON.stringify(options ?? {}));
}

/**
 * Format a JSON string. Initializes the engine on first use.
 * @param {string} input
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<string>}
 */
export async function format(input, options = {}) {
  await init();
  return wbgFormat(input, JSON.stringify(options ?? {}));
}

/** @returns {Promise<string>} engine + vendored upstream version */
export async function engineVersion() {
  await init();
  return engine_version();
}
