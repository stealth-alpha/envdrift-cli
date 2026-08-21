import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { diff, buildReport } from "../src/core.js";
import { parseEnv } from "../src/parse.js";
import { makeTempDir, write, removeDir } from "../test-support/helpers.js";

test("diff detects missing and extra vars", () => {
  const example = parseEnv("A=1\nB=2\nC=3\n");
  const env = parseEnv("A=1\nD=4\n");
  const r = diff(example, env);
  assert.deepEqual(
    r.missing.map((m) => m.name).sort(),
    ["B", "C"]
  );
  assert.deepEqual(
    r.extra.map((m) => m.name).sort(),
    ["D"]
  );
});

test("diff honors ignore list", () => {
  const example = parseEnv("A=1\nB=2\n");
  const env = parseEnv("A=1\n");
  const r = diff(example, env, { ignore: ["B"] });
  assert.equal(r.missing.length, 0);
  assert.deepEqual(r.ignored, ["B"]);
});

test("diff marks secret-like extras", () => {
  const example = parseEnv("A=1\n");
  const env = parseEnv("A=1\nLOCAL_TOKEN=abcdef123456abcdef123456\n");
  const r = diff(example, env);
  assert.equal(r.extra.length, 1);
  assert.equal(r.extra[0].secretLike, true);
});

test("buildReport returns null with no env files", () => {
  const dir = makeTempDir("ed-empty-");
  try {
    assert.equal(buildReport(dir), null);
  } finally {
    removeDir(dir);
  }
});

test("buildReport flags missing .env in gate-relevant way", () => {
  const dir = makeTempDir("ed-noenv-");
  try {
    write(path.join(dir, ".env.example"), "A=1\nB=2\n");
    const r = buildReport(dir);
    assert.equal(r.hasEnv, false);
    assert.equal(r.ok, false);
    assert.equal(r.counts.missing, 2);
  } finally {
    removeDir(dir);
  }
});

test("buildReport in-sync project passes", () => {
  const dir = makeTempDir("ed-ok-");
  try {
    write(path.join(dir, ".env.example"), "A=1\n");
    write(path.join(dir, ".env"), "A=1\n");
    const r = buildReport(dir);
    assert.equal(r.ok, true);
  } finally {
    removeDir(dir);
  }
});
