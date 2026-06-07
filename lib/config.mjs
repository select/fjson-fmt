// Option normalization + config-file discovery (mirrors fracjson's convention).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, parse as parsePath } from "node:path";

// Canonical engine option keys (snake_case, matching FracturedJsonOptions).
export const CANONICAL_KEYS = [
  "json_eol_style",
  "max_total_line_length",
  "max_inline_complexity",
  "max_compact_array_complexity",
  "max_table_row_complexity",
  "max_prop_name_padding",
  "colon_before_prop_name_padding",
  "table_comma_placement",
  "min_compact_array_row_items",
  "always_expand_depth",
  "nested_bracket_padding",
  "simple_bracket_padding",
  "colon_padding",
  "comma_padding",
  "comment_padding",
  "number_list_alignment",
  "indent_spaces",
  "use_tab_to_indent",
  "prefix_string",
  "comment_policy",
  "preserve_blank_lines",
  "allow_trailing_commas",
];

const norm = (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const LOOKUP = new Map(CANONICAL_KEYS.map((k) => [norm(k), k]));

/**
 * Translate an arbitrary-cased option object (snake_case, camelCase, PascalCase,
 * or fracjson long names) into canonical snake_case keys. Unknown keys throw.
 */
export function canonicalizeOptions(obj, sourceLabel = "options") {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const canonical = LOOKUP.get(norm(key));
    if (!canonical) {
      throw new Error(`Unknown option "${key}" in ${sourceLabel}`);
    }
    out[canonical] = value;
  }
  return out;
}

// Strip // and /* */ comments and trailing commas so .fracturedjson(.jsonc)
// files can be parsed by JSON.parse.
function stripJsonComments(text) {
  const noComments = text.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g,
    (m, str) => (str ? str : ""),
  );
  // Remove trailing commas before } or ] (outside strings).
  return noComments.replace(
    /("(?:\\.|[^"\\])*")|,(\s*[}\]])/g,
    (m, str, tail) => (str ? str : tail),
  );
}

const CONFIG_NAMES = [".fracturedjson", ".fracturedjson.jsonc", ".fracturedjson.json"];

/**
 * Walk up from `startDir` looking for a config file. Returns
 * { path, options } or null.
 */
export function discoverConfig(startDir) {
  let dir = resolve(startDir);
  const root = parsePath(dir).root;
  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return { path: candidate, options: loadConfigFile(candidate) };
      }
    }
    if (dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function loadConfigFile(path) {
  const raw = readFileSync(path, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(stripJsonComments(raw));
  } catch (err) {
    throw new Error(`Failed to parse config ${path}: ${err.message}`);
  }
  return canonicalizeOptions(parsed, path);
}
