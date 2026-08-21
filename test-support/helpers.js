import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTempDir(prefix = "envdrift-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function writeProject(dir, envContent, exampleContent) {
  if (exampleContent !== undefined) write(path.join(dir, ".env.example"), exampleContent);
  if (envContent !== undefined) write(path.join(dir, ".env"), envContent);
}

export function removeDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
