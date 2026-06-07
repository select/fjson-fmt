import { test } from "node:test";
import assert from "node:assert/strict";
import { format } from "../lib/engine.mjs";
import { canonicalizeOptions } from "../lib/config.mjs";

test("formats and aligns a table", () => {
  const input = JSON.stringify({
    rows: [
      { type: "turret", hp: 400, loc: { x: 47, y: -4 } },
      { type: "assassin", hp: 80, loc: { x: 12, y: 6 } },
      { type: "berserker", hp: 150, loc: { x: 0, y: 0 } },
    ],
  });
  const out = format(input, {});
  assert.match(out, /"type": "turret",\s+"hp": 400/);
  // number column right-aligned: 80 padded to width of 400
  assert.match(out, /"hp":  80/);
});

test("indent_spaces override", () => {
  const out = format(JSON.stringify({ a: { b: 1 } }), { indent_spaces: 2 });
  // a nested expand would use 2-space indent; ensure no 4-space indent appears
  assert.ok(!/\n {4}\S/.test(out));
});

test("idempotent", () => {
  const once = format(JSON.stringify({ a: 1, b: [1, 2, 3] }), {});
  const twice = format(once, {});
  assert.equal(once, twice);
});

test("comment_policy preserve keeps comments", () => {
  const input = '{\n  // hi\n  "a": 1\n}';
  const out = format(input, { comment_policy: "preserve" });
  assert.match(out, /\/\/ hi/);
});

test("comment_policy default errors on comments", () => {
  assert.throws(() => format('{\n  // hi\n  "a": 1\n}', {}));
});

test("canonicalizeOptions maps cased keys", () => {
  assert.deepEqual(canonicalizeOptions({ MaxTotalLineLength: 80, "indent-spaces": 2 }), {
    max_total_line_length: 80,
    indent_spaces: 2,
  });
});

test("canonicalizeOptions rejects unknown keys", () => {
  assert.throws(() => canonicalizeOptions({ bogus: 1 }), /Unknown option/);
});
