import test from "node:test";
import assert from "node:assert/strict";
import { isSecretLike, isPlaceholderValue, entropy } from "../src/secrets.js";

test("flags secret-shaped names", () => {
  assert.equal(isSecretLike("API_SECRET", "whatever"), true);
  assert.equal(isSecretLike("GITHUB_TOKEN", ""), true);
  assert.equal(isSecretLike("DB_PASSWORD", "hunter2"), true);
});

test("does not flag path-like KEY names", () => {
  assert.equal(isSecretLike("SSH_KEY_PATH", "/home/u/.ssh/id_rsa"), false);
  assert.equal(isSecretLike("KEY_FILE", "/etc/key.pem"), false);
});

test("flags PEM private keys by value", () => {
  assert.equal(
    isSecretLike("SOMETHING", "-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----"),
    true
  );
});

test("flags high-entropy values on innocuous names", () => {
  assert.equal(isSecretLike("SETTINGS", "Zk9mT2xkQmFkU2VjcmV0VmFsdWU5OQ=="), true);
  assert.equal(isSecretLike("SETTINGS", "plain-default"), false);
});

test("flags connection strings with embedded credentials", () => {
  assert.equal(isSecretLike("DATABASE_URL", "postgres://admin:s3cr3tpw@db.local:5432/app"), true);
  assert.equal(isSecretLike("DATABASE_URL", "postgres://db.local:5432/app"), false);
});

test("placeholder detection", () => {
  assert.equal(isPlaceholderValue("changeme"), true);
  assert.equal(isPlaceholderValue("<your-key-here>"), true);
  assert.equal(isPlaceholderValue("${DB_PASS}"), true);
  assert.equal(isPlaceholderValue("sk-live-abc123"), false);
});

test("entropy is low for repeated chars, higher for mixed text", () => {
  assert.ok(entropy("aaaaaaaaaa") < entropy("abcdefghij"));
  assert.equal(entropy(""), 0);
});
