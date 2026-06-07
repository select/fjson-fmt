# fjson-fmt

A **Prettier-style `--check` + `--write` formatter for JSON** built on the
[FracturedJson](https://j-brooke.github.io/FracturedJson/) algorithm — compact,
human-readable JSON with smart line breaks and table-like alignment.

The formatting engine is the Rust crate
[`fracturedjson`](https://github.com/fcoury/fracturedjson-rs) (MIT), **vendored
into `crate/` and compiled to WebAssembly** via `wasm-pack`. The CLI is a thin
Node.js layer that adds the check/write workflow, globbing, and config discovery
that no existing FracturedJson port provides.

It turns this:

```json
{
  "Isotopes": {
    "Hydrogen": [1, 2, 3],
    "Carbon": [11, 12, 13, 14],
    "Molybdenum": [92, 94, 95, 96, 97, 98, 100]
  },
  "ElementProperties": [
    { "symbol": "C", "number": 6, "mass": { "amu": 12, "round": 12 }, "phase": "solid" },
    { "symbol": "O", "number": 8, "mass": { "amu": 16, "round": 16 } },
    { "symbol": "Fe", "number": 26, "mass": { "amu": 56, "round": 56 }, "phase": "solid" }
  ]
}
```

using `npx fjson-fmt --stdin < example.json`, into this — compact, but with fields aligned like a table:

```json
{
    "Isotopes"         : {
        "Hydrogen"  : [ 1,  2,  3                 ],
        "Carbon"    : [11, 12, 13, 14             ],
        "Molybdenum": [92, 94, 95, 96, 97, 98, 100]
    },
    "ElementProperties": [
        { "symbol": "C",  "number":  6, "mass": {"amu": 12, "round": 12}, "phase": "solid" },
        { "symbol": "O",  "number":  8, "mass": {"amu": 16, "round": 16}                   },
        { "symbol": "Fe", "number": 26, "mass": {"amu": 56, "round": 56}, "phase": "solid" }
    ]
}
```

Long arrays of arrays get packed multiple items per line, neatly aligned:

```json
{
    "Bonds": [
        [ 6,  8], [ 6,  8], [ 8,  1], [ 8,  1], [ 6,  1], [ 6,  1], [ 6,  1], [ 6,  6], [ 6,  6], [ 6,  7], [ 7,  1],
        [ 7,  1], [ 6, 16], [16,  1], [15,  8], [15,  8], [15,  8], [11, 17], [11, 17], [12,  8], [12,  8], [20,  9],
        [20,  9], [19, 17], [19, 17], [13,  8], [13,  8], [13,  8], [14,  8], [14,  8], [ 5,  9], [ 5,  9]
    ]
}
```

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

# Format a file to stdout without modifying it
npx fjson-fmt --stdin < example.json
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
version, updates `CHANGELOG.md`, tags, pushes, creates a GitHub Release, and
publishes to npm. The `release` script injects a `GITHUB_TOKEN` from the `gh`
CLI automatically, so you just run:

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
