import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".github",
  "dist",
  "build",
  ".cache",
  "coverage",
  ".venv",
  "venv",
]);

/**
 * Walk a root directory and find every directory that contains at least one
 * env file worth reporting on.
 *
 * @param {string} root - directory to walk
 * @param {{ maxDepth?: number, files?: { env?: string, example?: string } }} [opts]
 * @returns {Array<{ dir: string, hasEnv: boolean, hasExample: boolean }>}
 */
export function findProjects(root, opts = {}) {
  const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : 4;
  const envName = opts.files?.env || ".env";
  const exampleName = opts.files?.example || ".env.example";
  const found = [];

  const visit = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable — skip silently
    }

    const hasEnv = entries.some((e) => e.isFile() && e.name === envName);
    const hasExample = entries.some((e) => e.isFile() && e.name === exampleName);
    if (hasEnv || hasExample) {
      found.push({ dir, hasEnv, hasExample });
    }
    if (depth >= maxDepth) return;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  };

  visit(path.resolve(root), 0);
  return found.sort((a, b) => a.dir.localeCompare(b.dir));
}
