import init, { format, engine_version } from "./pkg/fjson_fmt_engine.js";

const SAMPLE = `{
  "Isotopes": {
    "Hydrogen": [1, 2, 3],
    "Carbon": [11, 12, 13, 14],
    "Molybdenum": [92, 94, 95, 96, 97, 98, 100]
  },
  "ElementProperties": [
    { "symbol": "C", "number": 6, "mass": { "amu": 12, "round": 12 }, "phase": "solid" },
    { "symbol": "O", "number": 8, "mass": { "amu": 16, "round": 16 } },
    { "symbol": "Fe", "number": 26, "mass": { "amu": 56, "round": 56 }, "phase": "solid" }
  ],
  "Bonds": [
    [6, 8], [6, 8], [8, 1], [8, 1], [6, 1], [6, 1], [6, 1], [6, 6],
    [6, 6], [6, 7], [7, 1], [7, 1], [6, 16], [16, 1], [15, 8], [15, 8]
  ]
}`;

const $ = (id) => document.getElementById(id);
const els = {
  input: $("input"), output: $("output"), status: $("status"), ver: $("ver"),
  maxLine: $("maxLine"), indent: $("indent"), numAlign: $("numAlign"),
  trailing: $("trailing"), comments: $("comments"),
};

/* ── theme ──────────────────────────────────────────────── */
const root = document.documentElement;
const urlTheme = new URLSearchParams(location.search).get("theme");
const stored = urlTheme || localStorage.getItem("fjson-theme");
if (stored) root.dataset.theme = stored;
else if (matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";

$("theme").addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("fjson-theme", next);
});

/* ── engine ─────────────────────────────────────────────── */
let ready = false;
init().then(() => {
  ready = true;
  els.ver.textContent = "· v" + engine_version();
  run();
}).catch((e) => setStatus("Failed to load WASM engine: " + e, "error"));

function setStatus(msg, kind = "") {
  els.status.textContent = msg;
  els.status.className = "status" + (kind ? " " + kind : "");
}

function buildOptions() {
  const opts = {
    max_total_line_length: Number(els.maxLine.value) || 120,
    indent_spaces: Number(els.indent.value),
    allow_trailing_commas: els.trailing.checked,
    comment_policy: els.comments.checked ? "preserve" : "remove",
  };
  if (els.numAlign.value) opts.number_list_alignment = els.numAlign.value;
  return opts;
}

let timer;
function run() {
  if (!ready) return;
  const src = els.input.value.trim();
  if (!src) { els.output.textContent = ""; setStatus(""); return; }
  try {
    const t0 = performance.now();
    els.output.textContent = format(src, JSON.stringify(buildOptions()));
    setStatus(`Formatted in ${(performance.now() - t0).toFixed(1)} ms`, "ok");
  } catch (e) {
    setStatus(String(e).replace(/^Error:\s*/, ""), "error");
  }
}

function debounced() { clearTimeout(timer); timer = setTimeout(run, 150); }

/* ── wiring ─────────────────────────────────────────────── */
els.input.addEventListener("input", debounced);
[els.maxLine, els.indent, els.numAlign, els.trailing, els.comments]
  .forEach((el) => el.addEventListener("change", run));
els.maxLine.addEventListener("input", debounced);
els.indent.addEventListener("input", debounced);

$("sample").addEventListener("click", () => { els.input.value = SAMPLE; run(); });
$("clear").addEventListener("click", () => { els.input.value = ""; run(); els.input.focus(); });
$("copy").addEventListener("click", async () => {
  if (!els.output.textContent) return;
  try {
    await navigator.clipboard.writeText(els.output.textContent);
    setStatus("Copied to clipboard", "ok");
  } catch { setStatus("Copy failed", "error"); }
});

els.input.value = SAMPLE;
