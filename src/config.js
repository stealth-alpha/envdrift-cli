import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE_NAME = "envdrift.config.json";

export const DEFAULT_CONFIG = Object.freeze({
  files: {
    env: ".env",
    example: ".env.example",
  },
  ignore: [],
  scan: {
    maxDepth: 4,
  },
});

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Load envdrift.config.json from a directory, merged over defaults.
 * Missing file → defaults. Invalid JSON → throws with a clear message.
 */
export function loadConfig(dir, overrides = {}) {
  let user = {};
  const file = path.join(dir, CONFIG_FILE_NAME);
  if (fs.existsSync(file)) {
    try {
      user = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
      throw new Error(`Invalid ${CONFIG_FILE_NAME} at ${dir}: ${err.message}`);
    }
  }
  const merged = deepMerge(DEFAULT_CONFIG, user);
  return deepMerge(merged, overrides);
}

export function configExists(dir) {
  return fs.existsSync(path.join(dir, CONFIG_FILE_NAME));
}

export function configFileName() {
  return CONFIG_FILE_NAME;
}
