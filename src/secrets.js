/**
 * Secret-likeness heuristics. Two signals:
 *  1. Name shape — KEY / SECRET / TOKEN / PASSWORD style names.
 *  2. Value shape — long mixed-class values, PEM blocks, connection strings
 *     with embedded credentials.
 * Both are heuristics: they flag candidates for review, never prove anything.
 */

const NAME_RE =
  /(SECRET|TOKEN|PASSWD|PASSWORD|PASS|KEY|PRIVATE|CREDENTIAL|AUTH|SIGNING|SALT)/i;

// Name suffixes that make a KEY-named var NOT secret-looking (e.g. SSH_KEY_PATH).
const SAFE_NAME_RE = /(PATH|FILE|DIR|NAME|URL|HOST|ENDPOINT|ALIAS|LABEL|REGION)$/i;

/**
 * Shannon entropy of a string (bits per char).
 */
export function entropy(s) {
  if (!s) return 0;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function looksRandom(value) {
  const v = String(value);
  if (v.length < 20) return false;
  const classes =
    /[a-z]/.test(v) + /[A-Z]/.test(v) + /[0-9]/.test(v) + /[^a-zA-Z0-9]/.test(v);
  return classes >= 2 && entropy(v) > 3.2;
}

/**
 * Decide whether a variable is secret-looking.
 * @param {string} name
 * @param {string} value
 * @returns {boolean}
 */
export function isSecretLike(name, value) {
  const n = String(name || "");
  const v = String(value || "");
  if (!n && !v) return false;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v)) return true;

  const nameHit = NAME_RE.test(n);
  if (nameHit && !SAFE_NAME_RE.test(n)) return true;

  // Connection strings with credentials: scheme://user:pass@host
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/@\s]+:[^@\s]+@/i.test(v)) return true;

  // Long high-entropy values that are not obviously URLs/URIs/paths/sentinels.
  if (!/^(https?:\/\/|\/|file:|\$)/i.test(v) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) && looksRandom(v)) return true;

  return false;
}

/** Placeholder values that indicate a template rather than a real secret. */
const PLACEHOLDER_RE =
  /^(|change-?me|changeme|xxx+|yyy+|your[-_].*|<[^>]*>|\$\{[^}]*\}|\$[A-Z0-9_]+|example|placeholder|todo|fixme|\*+|\.+|-+)$/i;

export function isPlaceholderValue(value) {
  return PLACEHOLDER_RE.test(String(value || "").trim());
}
