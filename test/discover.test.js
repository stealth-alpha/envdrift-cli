import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { findProjects } from "../src/discover.js";
import { makeTempDir, writeProject, write, removeDir } from "../test-support/helpers.js";

test("findProjects discovers nested projects and skips node_modules/.git", () => {
  const root = makeTempDir("ed-scan-");
  try {
    writeProject(path.join(root, "api"), "X=1\n", "X=1\n");
    writeProject(path.join(root, "web"), "", "Y=1\n");
    // noise that must be skipped
    writeProject(path.join(root, "api", "node_modules", "dep"), "Z=1\n", "Z=1\n");
    writeProject(path.join(root, ".git", "hooks"), "W=1\n", "W=1\n");

    const found = findProjects(root, { maxDepth: 4 });
    const dirs = found.map((f) => path.relative(root, f.dir)).sort();
    assert.deepEqual(dirs, ["api", "web"]);
  } finally {
    removeDir(root);
  }
});

test("findProjects reports incomplete pairs distinctly", () => {
  const root = makeTempDir("ed-scan2-");
  try {
    writeProject(path.join(root, "only-env"), "A=1\n", undefined);
    writeProject(path.join(root, "only-example"), undefined, "B=1\n");
    const found = findProjects(root);
    const byName = Object.fromEntries(
      found.map((f) => [path.basename(f.dir), f])
    );
    assert.equal(byName["only-env"].hasEnv, true);
    assert.equal(byName["only-env"].hasExample, false);
    assert.equal(byName["only-example"].hasEnv, false);
    assert.equal(byName["only-example"].hasExample, true);
  } finally {
    removeDir(root);
  }
});
