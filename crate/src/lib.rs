//! WASM bindings around a vendored copy of the FracturedJson formatter engine.
//!
//! The `*.rs` modules in this crate (buffer, convert, error, formatter, model,
//! options, parser, table_template, tokenizer) are vendored verbatim from
//! `fcoury/fracturedjson-rs` (MIT, see UPSTREAM-LICENSE). This file is the only
//! original code: it exposes a single `format` entry point to JavaScript and
//! maps a JSON options blob onto `FracturedJsonOptions`.

mod buffer;
mod convert;
mod error;
mod formatter;
mod model;
mod options;
mod parser;
mod table_template;
mod tokenizer;

use formatter::Formatter;
use options::{
    CommentPolicy, EolStyle, FracturedJsonOptions, NumberListAlignment, TableCommaPlacement,
};
use serde::Deserialize;
use wasm_bindgen::prelude::*;

/// Serde-friendly mirror of the engine options. Every field is optional so the
/// JS side only needs to send overrides; anything omitted keeps the engine
/// default. Field names match the long `FracturedJsonOptions` names.
#[derive(Debug, Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
struct Config {
    json_eol_style: Option<String>,
    max_total_line_length: Option<usize>,
    max_inline_complexity: Option<isize>,
    max_compact_array_complexity: Option<isize>,
    max_table_row_complexity: Option<isize>,
    max_prop_name_padding: Option<usize>,
    colon_before_prop_name_padding: Option<bool>,
    table_comma_placement: Option<String>,
    min_compact_array_row_items: Option<usize>,
    always_expand_depth: Option<isize>,
    nested_bracket_padding: Option<bool>,
    simple_bracket_padding: Option<bool>,
    colon_padding: Option<bool>,
    comma_padding: Option<bool>,
    comment_padding: Option<bool>,
    number_list_alignment: Option<String>,
    indent_spaces: Option<usize>,
    use_tab_to_indent: Option<bool>,
    prefix_string: Option<String>,
    comment_policy: Option<String>,
    preserve_blank_lines: Option<bool>,
    allow_trailing_commas: Option<bool>,
}

fn eol_from(s: &str) -> Result<EolStyle, String> {
    match s.to_ascii_lowercase().as_str() {
        "crlf" => Ok(EolStyle::Crlf),
        "lf" => Ok(EolStyle::Lf),
        other => Err(format!("invalid json_eol_style: {other}")),
    }
}

fn comment_policy_from(s: &str) -> Result<CommentPolicy, String> {
    match s.to_ascii_lowercase().as_str() {
        "treataserror" | "error" => Ok(CommentPolicy::TreatAsError),
        "remove" => Ok(CommentPolicy::Remove),
        "preserve" => Ok(CommentPolicy::Preserve),
        other => Err(format!("invalid comment_policy: {other}")),
    }
}

fn number_align_from(s: &str) -> Result<NumberListAlignment, String> {
    match s.to_ascii_lowercase().as_str() {
        "left" => Ok(NumberListAlignment::Left),
        "right" => Ok(NumberListAlignment::Right),
        "decimal" => Ok(NumberListAlignment::Decimal),
        "normalize" => Ok(NumberListAlignment::Normalize),
        other => Err(format!("invalid number_list_alignment: {other}")),
    }
}

fn comma_placement_from(s: &str) -> Result<TableCommaPlacement, String> {
    match s.to_ascii_lowercase().as_str() {
        "beforepadding" => Ok(TableCommaPlacement::BeforePadding),
        "afterpadding" => Ok(TableCommaPlacement::AfterPadding),
        "beforepaddingexceptnumbers" => Ok(TableCommaPlacement::BeforePaddingExceptNumbers),
        other => Err(format!("invalid table_comma_placement: {other}")),
    }
}

fn build_options(cfg: Config) -> Result<FracturedJsonOptions, String> {
    let mut o = FracturedJsonOptions::default();
    if let Some(v) = cfg.json_eol_style {
        o.json_eol_style = eol_from(&v)?;
    }
    if let Some(v) = cfg.max_total_line_length {
        o.max_total_line_length = v;
    }
    if let Some(v) = cfg.max_inline_complexity {
        o.max_inline_complexity = v;
    }
    if let Some(v) = cfg.max_compact_array_complexity {
        o.max_compact_array_complexity = v;
    }
    if let Some(v) = cfg.max_table_row_complexity {
        o.max_table_row_complexity = v;
    }
    if let Some(v) = cfg.max_prop_name_padding {
        o.max_prop_name_padding = v;
    }
    if let Some(v) = cfg.colon_before_prop_name_padding {
        o.colon_before_prop_name_padding = v;
    }
    if let Some(v) = cfg.table_comma_placement {
        o.table_comma_placement = comma_placement_from(&v)?;
    }
    if let Some(v) = cfg.min_compact_array_row_items {
        o.min_compact_array_row_items = v;
    }
    if let Some(v) = cfg.always_expand_depth {
        o.always_expand_depth = v;
    }
    if let Some(v) = cfg.nested_bracket_padding {
        o.nested_bracket_padding = v;
    }
    if let Some(v) = cfg.simple_bracket_padding {
        o.simple_bracket_padding = v;
    }
    if let Some(v) = cfg.colon_padding {
        o.colon_padding = v;
    }
    if let Some(v) = cfg.comma_padding {
        o.comma_padding = v;
    }
    if let Some(v) = cfg.comment_padding {
        o.comment_padding = v;
    }
    if let Some(v) = cfg.number_list_alignment {
        o.number_list_alignment = number_align_from(&v)?;
    }
    if let Some(v) = cfg.indent_spaces {
        o.indent_spaces = v;
    }
    if let Some(v) = cfg.use_tab_to_indent {
        o.use_tab_to_indent = v;
    }
    if let Some(v) = cfg.prefix_string {
        o.prefix_string = v;
    }
    if let Some(v) = cfg.comment_policy {
        o.comment_policy = comment_policy_from(&v)?;
    }
    if let Some(v) = cfg.preserve_blank_lines {
        o.preserve_blank_lines = v;
    }
    if let Some(v) = cfg.allow_trailing_commas {
        o.allow_trailing_commas = v;
    }
    Ok(o)
}

/// Format `input` JSON text using FracturedJson.
///
/// `options_json` is a JSON object string of option overrides (may be empty or
/// `"{}"`). Returns the formatted string, or rejects with an error message.
#[wasm_bindgen]
pub fn format(input: &str, options_json: &str) -> Result<String, JsValue> {
    let cfg: Config = if options_json.trim().is_empty() {
        Config::default()
    } else {
        serde_json::from_str(options_json)
            .map_err(|e| JsValue::from_str(&format!("invalid options: {e}")))?
    };
    let options = build_options(cfg).map_err(|e| JsValue::from_str(&e))?;
    let mut formatter = Formatter::new();
    formatter.options = options;
    formatter
        .reformat(input, 0)
        .map_err(|e| JsValue::from_str(&format!("{e}")))
}

/// Engine + vendored upstream version, for diagnostics.
#[wasm_bindgen]
pub fn engine_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
