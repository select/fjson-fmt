// Loads the WASM engine (built by wasm-pack, nodejs/CommonJS target) from ESM.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

let engine;
try {
  engine = require(join(here, "..", "pkg", "fjson_fmt_engine.js"));
} catch (err) {
  throw new Error(
    `Failed to load the WASM engine from ./pkg. Did you run \`npm run build:wasm\`?\n${err.message}`,
  );
}

/**
 * Format a JSON string with FracturedJson.
 * @param {string} input
 * @param {Record<string, unknown>} options canonical snake_case option overrides
 * @returns {string} formatted text (no trailing newline)
 */
export function format(input, options = {}) {
  return engine.format(input, JSON.stringify(options ?? {}));
}

export function engineVersion() {
  return engine.engine_version();
}
