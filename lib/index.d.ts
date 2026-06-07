// Public library API for fjson-fmt (works in Node and the browser).
// Canonical option keys are snake_case names from FracturedJsonOptions.
export interface FormatOptions {
  json_eol_style?: "lf" | "crlf";
  max_total_line_length?: number;
  max_inline_complexity?: number;
  max_compact_array_complexity?: number;
  max_table_row_complexity?: number;
  max_prop_name_padding?: number;
  colon_before_prop_name_padding?: boolean;
  table_comma_placement?: string;
  min_compact_array_row_items?: number;
  always_expand_depth?: number;
  nested_bracket_padding?: boolean;
  simple_bracket_padding?: boolean;
  colon_padding?: boolean;
  comma_padding?: boolean;
  comment_padding?: boolean;
  number_list_alignment?: "left" | "right" | "decimal";
  indent_spaces?: number;
  use_tab_to_indent?: boolean;
  prefix_string?: string;
  comment_policy?: "error" | "remove" | "preserve";
  preserve_blank_lines?: boolean;
  allow_trailing_commas?: boolean;
  [key: string]: unknown;
}

/**
 * Initialize the engine. No-op on Node; loads + instantiates the WASM in the
 * browser. Idempotent. In the browser you may pass a custom module/URL.
 */
export function init(moduleOrPath?: unknown): Promise<void>;

/** Format JSON. Initializes the engine on first use. */
export function format(input: string, options?: FormatOptions): Promise<string>;

/**
 * Format JSON synchronously. Available immediately on Node; in the browser
 * requires a prior `await init()` (throws otherwise).
 */
export function formatSync(input: string, options?: FormatOptions): string;

/** Engine + vendored upstream version string. */
export function engineVersion(): string | Promise<string>;
