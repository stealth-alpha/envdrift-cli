import test from "node:test";
import assert from "node:assert/strict";
import { parseLine, parseEnv } from "../src/parse.js";

test("parseLine handles plain assignments", () => {
  assert.deepEqual(parseLine("FOO=bar"), { key: "FOO", value: "bar" });
});

test("parseLine handles export prefix and quotes", () => {
  assert.deepEqual(parseLine('export KEY="hello world"'), { key: "KEY", value: "hello world" });
  assert.deepEqual(parseLine("SINGLE='a b'"), { key: "SINGLE", value: "a b" });
});

test("parseLine keeps = inside values", () => {
  assert.deepEqual(parseLine("CONN=a=b=c"), { key: "CONN", value: "a=b=c" });
});

test("parseLine ignores comments, blanks, and junk", () => {
  assert.equal(parseLine("# comment"), null);
  assert.equal(parseLine(""), null);
  assert.equal(parseLine("   "), null);
  assert.equal(parseLine("not an assignment"), null);
});

test("parseEnv strips inline comments on unquoted values only", () => {
  const map = parseEnv('A=1 # trailing\nB="2 # keep"\nC=3\n');
  assert.equal(map.get("A"), "1");
  assert.equal(map.get("B"), "2 # keep");
  assert.equal(map.get("C"), "3");
});

test("parseEnv later assignments win (dotenv semantics)", () => {
  const map = parseEnv("A=first\nA=second\n");
  assert.equal(map.get("A"), "second");
});
