# fjson-fmt

A **Prettier-style `--check` + `--write` formatter for JSON** built on the
[FracturedJson](https://j-brooke.github.io/FracturedJson/) algorithm — compact,
human-readable JSON with smart line breaks and table-like alignment.

The formatting engine is the Rust crate
[`fracturedjson`](https://github.com/fcoury/fracturedjson-rs) (MIT), **vendored
into `crate/` and compiled to WebAssembly** via `wasm-pack`. The CLI is a thin
Node.js layer that adds the check/write workflow, globbing, and config discovery
that no existing FracturedJson port provides.

It is designed to run **alongside [oxfmt](https://oxc.rs/docs/guide/usage/formatter)**
(which owns JS/TS/CSS/etc.), since neither oxfmt nor oxlint can format `.json`
with FracturedJson.

## Install

```sh
npm i -D fjson-fmt   # ships prebuilt WASM; no Rust toolchain needed
```

## Usage

```sh
# Format files in place (default)
fjson-fmt "**/*.json"

# Verify formatting (CI) — exits 1 if anything would change
fjson-fmt --check "**/*.json"

# List files that differ (no writing)
fjson-fmt --list-different "**/*.json"

# stdin → stdout
cat data.json | fjson-fmt --stdin --indent 2
```

Run alongside oxfmt:

```jsonc
// package.json
{
  "scripts": {
    "fmt": "oxfmt && fjson-fmt \"**/*.json\"",
    "fmt:check": "oxfmt --check && fjson-fmt --check \"**/*.json\""
  }
}
```

## Options

CLI flags (override config files):

| Flag | Effect |
|------|--------|
| `--write` | Format in place (default) |
| `--check` | Verify; exit 1 if any file would change |
| `-l, --list-different` | List differing files; exit 1 if any |
| `--stdin` | Read stdin, write formatted result to stdout |
| `-c, --config <path>` | Explicit config file |
| `--no-config` | Skip config discovery |
| `--indent <n>` | Spaces per indent (default 4) |
| `--tabs` | Indent with tabs |
| `--max-line <n>` | Max total line length (default 120) |
| `--eol <lf\|crlf>` | Line ending style |
| `--comments <error\|remove\|preserve>` | Comment policy |
| `--trailing` | Allow trailing commas in input |
| `--no-final-newline` | Don't append a trailing newline |

## Config files

Discovered by walking up from each file's directory (like fracjson):
`.fracturedjson`, `.fracturedjson.jsonc`, `.fracturedjson.json`. Comments and
trailing commas are allowed. Keys map to `FracturedJsonOptions` and are
case-insensitive (snake_case, camelCase, PascalCase, and fracjson long names
all work):

```jsonc
{
  // .fracturedjson.jsonc
  "indent_spaces": 2,
  "max_total_line_length": 100,
  "comment_policy": "preserve",
  "allow_trailing_commas": true
}
```

Full option list: see `crate/src/options.rs`.

## Development

Requires Rust + the `wasm32-unknown-unknown` target + `wasm-pack`, plus
[pnpm](https://pnpm.io) for the Node tooling.

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack   # or use the binary installer
pnpm install              # dev dependencies (release-it, etc.)

pnpm build:wasm           # rebuilds pkg/ from crate/
pnpm test                 # node --test (CLI/engine glue, no toolchain)
pnpm test:engine          # cargo test — FracturedJson engine suite (needs Rust)
pnpm test:all             # both of the above
```

### Releasing

Releases are cut with [release-it](https://github.com/release-it/release-it)
(conventional-changelog, angular preset). It runs the full test suite, bumps the
version, updates `CHANGELOG.md`, tags, pushes, and publishes to npm:

```sh
pnpm release              # interactive; or: pnpm release --ci patch|minor|major
```

### Engine test suite

The Rust engine is verified by the FracturedJson port's integration test suite
(vendored from `fcoury/fracturedjson-rs`, which itself tracks j-brooke's
cross-implementation "universal" tests). It lives in `crate/tests/` and runs
against the standard shared fixtures in `test/StandardJsonFiles/` and
`test/FilesWithComments/` (from `j-brooke/FracturedJsonJs`):

```sh
pnpm test:engine          # or: cargo test --manifest-path crate/Cargo.toml
```

The prebuilt `pkg/` (WASM + JS glue) is committed so the CLI works without a
Rust toolchain.

## License

MIT. The vendored engine in `crate/src/*.rs` (except `lib.rs`) is from
`fcoury/fracturedjson-rs`, MIT © Felipe Coury — see `crate/UPSTREAM-LICENSE`.
