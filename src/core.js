import fs from "node:fs";
import path from "node:path";
import { parseEnvFile } from "./parse.js";
import { loadConfig, DEFAULT_CONFIG } from "./config.js";
import { isSecretLike, isPlaceholderValue } from "./secrets.js";

/**
 * Compare documented vars (example) against live vars (env).
 */
export function diff(exampleVars, envVars, opts = {}) {
  const ignore = new Set(opts.ignore || []);
  const ignored = [];
  const keep = (name) => {
    if (ignore.has(name)) {
      ignored.push(name);
      return false;
    }
    return true;
  };

  const missing = [];
  for (const [name, value] of exampleVars) {
    if (!keep(name)) continue;
    if (!envVars.has(name)) {
      missing.push({ name, placeholder: isPlaceholderValue(value) });
    }
  }

  const extra = [];
  const emptyInEnv = [];
  const secretsInEnv = [];
  for (const [name, value] of envVars) {
    if (!keep(name)) continue;
    const secretLike = isSecretLike(name, value);
    if (secretLike) secretsInEnv.push(name);
    if (!exampleVars.has(name)) {
      extra.push({ name, secretLike, empty: value === "" });
    } else if (value === "") {
      emptyInEnv.push(name);
    }
  }

  const byName = (a, b) => a.name.localeCompare(b.name);
  missing.sort(byName);
  extra.sort(byName);
  emptyInEnv.sort();
  secretsInEnv.sort();

  return { missing, extra, emptyInEnv, secretsInEnv, ignored };
}

/**
 * Build the full report model for one project directory.
 * @param {string} dir
 * @param {{ config?: object }} [overrides]
 * @returns {object|null} report, or null when neither file exists
 */
export function buildReport(dir, overrides = {}) {
  const config = overrides.config || loadConfig(dir);
  const files = {
    ...DEFAULT_CONFIG.files,
    ...(config.files || {}),
  };
  const ignore = [...(DEFAULT_CONFIG.ignore || []), ...(config.ignore || [])];

  const envPath = path.join(dir, files.env);
  const examplePath = path.join(dir, files.example);

  const hasExample = fs.existsSync(examplePath);
  const hasEnv = fs.existsSync(envPath);
  if (!hasExample && !hasEnv) return null;

  const result = diff(
    hasExample ? parseEnvFile(examplePath) : new Map(),
    hasEnv ? parseEnvFile(envPath) : new Map(),
    { ignore }
  );

  return {
    dir,
    envFile: envPath,
    exampleFile: examplePath,
    hasExample,
    hasEnv,
    counts: {
      missing: result.missing.length,
      extra: result.extra.length,
      empty: result.emptyInEnv.length,
      secretLike: result.secretsInEnv.length,
    },
    ...result,
    ok: hasExample && hasEnv && result.missing.length === 0 && result.extra.length === 0,
  };
}
