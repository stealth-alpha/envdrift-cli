/**
 * Console output helpers — dependency-free ANSI colors.
 */
import process from "node:process";

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

export function paint(inner, code) {
  return useColor ? `${colors[code] ?? ""}${inner}${colors.reset}` : inner;
}

export function dim(s) {
  return paint(s, "dim");
}
export function bold(s) {
  return paint(s, "bold");
}
export function green(s) {
  return paint(s, "green");
}
export function red(s) {
  return paint(s, "red");
}
export function cyan(s) {
  return paint(s, "cyan");
}
export function yellow(s) {
  return paint(s, "yellow");
}

export function log(msg = "") {
  process.stdout.write(`${msg}\n`);
}

export function error(msg) {
  process.stderr.write(`${paint("error", "red")}: ${msg}\n`);
}

export function warn(msg) {
  process.stderr.write(`${paint("warn", "yellow")}: ${msg}\n`);
}

export function success(msg) {
  process.stdout.write(`${paint("✔", "green")} ${msg}\n`);
}

export function info(msg) {
  process.stdout.write(`${dim(msg)}\n`);
}
