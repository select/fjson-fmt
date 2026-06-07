// Smoke test for the public library entry (the conditional "node" export).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as lib from "../lib/index.node.mjs";

test("library exposes init/format/formatSync/engineVersion", () => {
  for (const fn of ["init", "format", "formatSync", "engineVersion"]) {
    assert.equal(typeof lib[fn], "function", `${fn} should be a function`);
  }
});

test("formatSync formats and aligns", () => {
  const out = lib.formatSync('{"a":[1,2,3],"bb":[44,55]}', { max_total_line_length: 120 });
  assert.equal(out.trimEnd(), '{ "a": [1, 2, 3], "bb": [44, 55] }');
});

test("async format matches formatSync", async () => {
  await lib.init();
  const src = '{"z":[9,8,7]}';
  assert.equal(await lib.format(src), lib.formatSync(src));
});

test("engineVersion returns a version string", () => {
  assert.match(lib.engineVersion(), /^\d+\.\d+\.\d+/);
});
