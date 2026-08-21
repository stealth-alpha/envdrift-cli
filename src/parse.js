/**
 * .env parsing — dependency-free, forgiving, and deterministic.
 *
 * Supported shapes (mirrors what dotenv-family tools accept in practice):
 *   KEY=value
 *   export KEY=value
 *   # comment
 *   blank lines
 * Values keep everything after the first `=` (so `A=b=c` → `A` = `b=c`).
 */

import fs from "node:fs";

/**
 * Parse a single logical line into a { key, value } pair, or null.
 * @param {string} line
 * @returns {{ key: string, value: string } | null}
 */
export function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  let body = trimmed;
  if (body.startsWith("export ")) body = body.slice(7).trim();

  const eq = body.indexOf("=");
  if (eq === -1) return null; // not an assignment — ignore silently

  const key = body.slice(0, eq).trim();
  if (!key || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) return null;

  let value = body.slice(eq + 1).trim();

  // Strip surrounding matching quotes and inline comments outside quotes.
  const q = value[0];
  if (q === '"' || q === "'") {
    const end = value.lastIndexOf(q);
    if (end > 0) {
      value = value.slice(1, end);
    }
  } else if (value.includes(" #")) {
    // naive inline comment for unquoted values
    const hash = value.indexOf(" #");
    value = value.slice(0, hash).trim();
  }

  return { key, value };
}

/**
 * Parse full .env content into an ordered map of key → value.
 * Later assignments override earlier ones (same as dotenv).
 * @param {string} content
 * @returns {Map<string, string>}
 */
export function parseEnv(content) {
  const map = new Map();
  for (const line of String(content).split(/\r?\n/)) {
    const pair = parseLine(line);
    if (pair) map.set(pair.key, pair.value);
  }
  return map;
}

/**
 * Parse a file's raw text into a var map. Returns empty map when unreadable.
 * @param {string} filePath
 * @returns {Map<string, string>}
 */
export function parseEnvFile(filePath) {
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return new Map();
  }
  return parseEnv(content);
}
