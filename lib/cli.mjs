import { readFileSync, writeFileSync, globSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import { dirname, relative } from "node:path";
import process from "node:process";
import { format, engineVersion } from "./engine.mjs";
import { canonicalizeOptions, discoverConfig, loadConfigFile } from "./config.mjs";

const HELP = `fjson-fmt — FracturedJson formatter with check + write modes

Usage:
  fjson-fmt [options] [files/globs...]
  cat file.json | fjson-fmt --stdin

Modes (default: --write):
  --write                Format files in place
  --check                Verify formatting; exit 1 if any file would change
  -l, --list-different   List files that differ; exit 1 if any (no writing)
  --stdin                Read JSON from stdin, write formatted result to stdout

Config:
  -c, --config <path>    Use an explicit config file
  --no-config            Ignore .fracturedjson(.json|.jsonc) discovery

Common option overrides (take precedence over config files):
  --indent <n>           Spaces per indent (default 4)
  --tabs                 Indent with tabs
  --max-line <n>         Max total line length (default 120)
  --eol <lf|crlf>        Line ending style
  --comments <p>         Comment policy: error | remove | preserve
  --trailing             Allow trailing commas in input
  --no-final-newline     Do not append a trailing newline

Other:
  -h, --help             Show this help
  -v, --version          Show version
`;

function parseCliOptionOverrides(values) {
  const o = {};
  if (values.indent !== undefined) o.indent_spaces = Number(values.indent);
  if (values.tabs) o.use_tab_to_indent = true;
  if (values["max-line"] !== undefined) o.max_total_line_length = Number(values["max-line"]);
  if (values.eol !== undefined) o.json_eol_style = values.eol;
  if (values.comments !== undefined) o.comment_policy = values.comments;
  if (values.trailing) o.allow_trailing_commas = true;
  return canonicalizeOptions(o, "CLI flags");
}

function eolString(options) {
  return String(options.json_eol_style ?? "lf").toLowerCase() === "crlf" ? "\r\n" : "\n";
}

function render(input, options, finalNewline) {
  let out = format(input, options);
  if (finalNewline && !out.endsWith("\n")) out += eolString(options);
  return out;
}

function expandFiles(patterns) {
  const seen = new Set();
  const files = [];
  for (const pat of patterns) {
    let matches;
    try {
      // Direct path? keep as-is if it exists and isn't a glob.
      if (!/[*?[\]{}]/.test(pat) && statSync(pat).isFile()) {
        matches = [pat];
      }
    } catch {
      /* fall through to glob */
    }
    matches ??= globSync(pat);
    for (const f of matches) {
      if (!seen.has(f)) {
        seen.add(f);
        files.push(f);
      }
    }
  }
  return files;
}

export async function run(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        write: { type: "boolean" },
        check: { type: "boolean" },
        "list-different": { type: "boolean", short: "l" },
        stdin: { type: "boolean" },
        config: { type: "string", short: "c" },
        "no-config": { type: "boolean" },
        indent: { type: "string" },
        tabs: { type: "boolean" },
        "max-line": { type: "string" },
        eol: { type: "string" },
        comments: { type: "string" },
        trailing: { type: "boolean" },
        "no-final-newline": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    process.stderr.write(`${err.message}\n\n${HELP}`);
    return 2;
  }

  const { values, positionals } = parsed;
  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (values.version) {
    process.stdout.write(`fjson-fmt (engine ${engineVersion()})\n`);
    return 0;
  }

  const finalNewline = !values["no-final-newline"];
  let cliOverrides;
  try {
    cliOverrides = parseCliOptionOverrides(values);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }

  // Explicit config (applies to all inputs); otherwise discover per-file.
  let explicitConfig = null;
  if (values.config) {
    try {
      explicitConfig = loadConfigFile(values.config);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
  }
  const resolveOptions = (fileDir) => {
    let base = {};
    if (!values["no-config"]) {
      base = explicitConfig ?? discoverConfig(fileDir)?.options ?? {};
    }
    return { ...base, ...cliOverrides };
  };

  // ---- stdin mode ----
  if (values.stdin) {
    const input = await readStdin();
    try {
      const out = render(input, resolveOptions(process.cwd()), finalNewline);
      process.stdout.write(out);
      return 0;
    } catch (err) {
      process.stderr.write(`stdin: ${err.message}\n`);
      return 2;
    }
  }

  if (positionals.length === 0) {
    process.stderr.write(`No input files. Provide paths/globs or use --stdin.\n\n${HELP}`);
    return 2;
  }

  const files = expandFiles(positionals);
  if (files.length === 0) {
    process.stderr.write(`No files matched: ${positionals.join(", ")}\n`);
    return 2;
  }

  const checkMode = values.check || values["list-different"];
  const differing = [];
  let hadError = false;

  for (const file of files) {
    let input;
    try {
      input = readFileSync(file, "utf8");
    } catch (err) {
      process.stderr.write(`error: cannot read ${file}: ${err.message}\n`);
      hadError = true;
      continue;
    }
    let out;
    try {
      out = render(input, resolveOptions(dirname(file)), finalNewline);
    } catch (err) {
      process.stderr.write(`error: ${file}: ${err.message}\n`);
      hadError = true;
      continue;
    }

    const changed = out !== input;
    if (checkMode) {
      if (changed) differing.push(file);
    } else {
      // write mode (default)
      if (changed) {
        try {
          writeFileSync(file, out);
          process.stdout.write(`${file}\n`);
        } catch (err) {
          process.stderr.write(`error: cannot write ${file}: ${err.message}\n`);
          hadError = true;
        }
      }
    }
  }

  if (checkMode) {
    if (differing.length > 0) {
      const label = values["list-different"] ? "" : "would reformat: ";
      for (const f of differing) {
        process.stdout.write(`${label}${relative(process.cwd(), f)}\n`);
      }
      if (!values["list-different"]) {
        process.stderr.write(
          `\n${differing.length} file(s) are not formatted. Run \`fjson-fmt\` to fix.\n`,
        );
      }
      return 1;
    }
    process.stderr.write(`All matched files are formatted.\n`);
  }

  return hadError ? 2 : 0;
}

function readStdin() {
  return new Promise((resolvePromise, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", reject);
  });
}
