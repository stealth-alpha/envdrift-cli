import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadConfig, DEFAULT_CONFIG, configFileName, configExists } from "../src/config.js";
import { makeTempDir, write, removeDir } from "../test-support/helpers.js";

test("loadConfig returns defaults when no file present", () => {
  const dir = makeTempDir("ed-cfg-");
  try {
    const c = loadConfig(dir);
    assert.equal(c.files.env, ".env");
    assert.equal(c.files.example, ".env.example");
    assert.deepEqual(c.ignore, []);
  } finally {
    removeDir(dir);
  }
});

test("loadConfig merges user config over defaults", () => {
  const dir = makeTempDir("ed-cfg2-");
  try {
    write(path.join(dir, configFileName()), JSON.stringify({ ignore: ["NOISE"] }));
    const c = loadConfig(dir);
    assert.deepEqual(c.ignore, ["NOISE"]);
    assert.equal(c.scan.maxDepth, DEFAULT_CONFIG.scan.maxDepth);
  } finally {
    removeDir(dir);
  }
});

test("loadConfig throws on invalid JSON with a clear message", () => {
  const dir = makeTempDir("ed-cfg3-");
  try {
    write(path.join(dir, configFileName()), "{ nope");
    assert.throws(() => loadConfig(dir), /Invalid envdrift.config.json/);
  } finally {
    removeDir(dir);
  }
});

test("configExists detects presence", () => {
  const dir = makeTempDir("ed-cfg4-");
  try {
    assert.equal(configExists(dir), false);
    write(path.join(dir, configFileName()), "{}");
    assert.equal(configExists(dir), true);
  } finally {
    removeDir(dir);
  }
});
