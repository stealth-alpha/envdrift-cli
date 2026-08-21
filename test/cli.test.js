import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeTempDir, writeProject, removeDir } from "../test-support/helpers.js";
import { formatText, formatJson, summarize } from "../src/report.js";
import { buildReport } from "../src/core.js";

const bin = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin", "envdrift.js");

function runCli(args, cwd) {
  return execFileSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

test("formatText renders verdicts without leaking values", () => {
  const dir = makeTempDir("ed-fmt-");
  try {
    writeProject(
      dir,
      "A=1\nTOKEN=supersecretvalue123456\n",
      "A=1\nB=2\n"
    );
    const r = buildReport(dir);
    const text = formatText(r, path.dirname(dir));
    assert.match(text, /missing/);
    assert.match(text, /extra/);
    assert.match(text, /secret-like/);
    assert.ok(!text.includes("supersecretvalue123456"), "must never print values");
  } finally {
    removeDir(dir);
  }
});

test("formatJson includes summary and no values", () => {
  const dir = makeTempDir("ed-json-");
  try {
    writeProject(dir, "A=1\nEXTRA=1\n", "A=1\nB=2\n");
    const r = buildReport(dir);
    const json = JSON.parse(formatJson([r], { command: "check" }));
    assert.equal(json.summary.drifted, 1);
    assert.equal(json.projects[0].missing.some((m) => m.name === "B"), true);
    assert.ok(!JSON.stringify(json).includes("EXTRA=1"));
  } finally {
    removeDir(dir);
  }
});

test("summarize counts ok vs drifted", () => {
  const s = summarize([
    { hasEnv: true, hasExample: true, ok: true, missing: [], extra: [], secretsInEnv: [] },
    {
      hasEnv: true,
      hasExample: true,
      ok: false,
      missing: [{ name: "B" }],
      extra: [{ name: "X" }],
      secretsInEnv: ["LOCAL_TOKEN"],
    },
  ]);
  assert.equal(s.ok, 1);
  assert.equal(s.drifted, 1);
  assert.equal(s.missing, 1);
  assert.equal(s.extra, 1);
});

test("CLI check exits 0 when in sync and 1 on drift with --ci", () => {
  const okDir = makeTempDir("ed-cli-ok-");
  const badDir = makeTempDir("ed-cli-bad-");
  try {
    writeProject(okDir, "A=1\n", "A=1\n");
    assert.equal(runCli(["check", "--ci"], okDir) !== undefined, true);

    writeProject(badDir, "A=1\n", "A=1\nB=2\n");
    assert.throws(
      () => runCli(["check", "--ci"], badDir),
      (err) => err.status === 1
    );
  } finally {
    removeDir(okDir);
    removeDir(badDir);
  }
});

test("CLI scan gates across a tree", () => {
  const root = makeTempDir("ed-cli-scan-");
  try {
    writeProject(path.join(root, "good"), "A=1\n", "A=1\n");
    writeProject(path.join(root, "bad"), "A=1\nZ=9\n", "A=1\n");
    assert.throws(
      () => runCli(["scan", "--dir", root, "--ci"], root),
      (err) => err.status === 1
    );
    // and without --ci it succeeds while still reporting
    const out = runCli(["scan", "--dir", root], root);
    assert.match(out, /1 project drifted/);
  } finally {
    removeDir(root);
  }
});
