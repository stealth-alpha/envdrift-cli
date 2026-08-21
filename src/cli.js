import fs from "node:fs";
import path from "node:path";
import { log, info, success, error, warn, green, cyan, yellow, bold, dim, red } from "./util.js";
import { loadConfig, configExists, configFileName } from "./config.js";
import { buildReport } from "./core.js";
import { findProjects } from "./discover.js";
import { formatText, formatJson, summarize } from "./report.js";

const VERSION = "0.1.0";

class EnvDriftError extends Error {}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function printVersion() {
  log(VERSION);
}

function printHelp() {
  log(`envdrift ${VERSION}

${bold("Usage")}
  envdrift <command> [options]

${bold("Commands")}
  check                Compare .env.example vs .env in a directory
  scan                 Walk a directory tree and report drift in every project found
  init                 Create an ${configFileName()} in the current directory
  version              Print the envdrift version
  help                 Show this help

${bold("Options")}
  --dir <path>         Target directory (default: current directory)
  --format <f>         Output format (text | json)
  --ci                 Gate mode: exit code 1 when any project has drifted
                       or is incomplete (missing .env / .env.example)
  --ignore <var,...>   Extra variable names to skip (comma-separated)
  --max-depth <n>      Max depth for scan (default: 4)
  --silent             Suppress per-project output; summary only

${bold("Examples")}
  envdrift check
  envdrift check --dir ./services/api --format json
  envdrift scan --dir ~/code
  envdrift scan --dir ~/code --ci   # CI gate: non-zero exit on drift
`);
}

async function cmdInit(flags) {
  const dir = resolveDir(flags);
  const file = path.join(dir, configFileName());
  if (fs.existsSync(file)) {
    warn(`${configFileName()} already exists at ${file}`);
    return;
  }
  const template = {
    files: { env: ".env", example: ".env.example" },
    ignore: ["NODE_ENV"],
    scan: { maxDepth: 4 },
  };
  fs.writeFileSync(file, JSON.stringify(template, null, 2) + "\n");
  success(`Created ${configFileName()} at ${cyan(file)}`);
  info(dim("Add var names to `ignore` to silence known-noisy vars."));
}

function resolveDir(flags) {
  const dir = path.resolve(flags.dir || flags.cwd || process.cwd());
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new EnvDriftError(`Directory not found: ${dir}`);
  }
  return dir;
}

async function cmdCheck(flags) {
  const dir = resolveDir(flags);
  const config = loadConfig(dir);
  const extraIgnore = parseIgnoreFlag(flags.ignore);
  const report = buildReport(dir, {
    config,
    ignore: extraIgnore,
  });

  if (!report) {
    if (flags.ci) {
      failGate([`no .env or .env.example found in ${dir}`], meta({ projects: [] }));
    }
    warn(`No .env or .env.example found in ${dir} — nothing to compare.`);
    return;
  }

  emit(report, dir, flags, { command: "check" });
  gate([report], flags);
}

async function cmdScan(flags) {
  const root = resolveDir(flags);
  const maxDepth = Number(flags.maxDepth || 4);
  const projects = findProjects(root, { maxDepth });
  const reports = [];
  let base = null;

  for (const project of projects) {
    const config = loadConfig(project.dir);
    // Respect per-directory config only when it points at the same file names,
    // so discovery and comparison stay consistent.
    const report = buildReport(project.dir, {
      config,
      ignore: parseIgnoreFlag(flags.ignore),
    });
    if (!report || !project.hasEnv || !project.hasExample) {
      if (!flags.silent && report) {
        warn(
          `${project.dir}: incomplete pair (${project.hasEnv ? ".env" : "no .env"}, ${
            project.hasExample ? ".env.example" : "no .env.example"
          })`
        );
      }
      if (!report) continue;
    }
    if (base === null) base = root;
    reports.push(report);
  }

  if (reports.length === 0) {
    warn(`No env files found under ${root} (depth ${maxDepth}).`);
    return;
  }

  emit(reports, base, flags, { command: "scan", scannedRoot: root });
  gate(reports, flags);
}

function parseIgnoreFlag(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function meta(extra) {
  return { tool_version: VERSION, generated_at: new Date().toISOString(), ...extra };
}

function emit(reportOrReports, base, flags, extraMeta) {
  if (flags.format === "json") {
    log(formatJson(reportOrReports, meta(extraMeta)));
    return;
  }
  if (!flags.silent) {
    const list = Array.isArray(reportOrReports) ? reportOrReports : [reportOrReports];
    for (const r of list) log(formatText(r, base));
    log("");
  }
  const s = summarize(reportOrReports);
  const verdict =
    s.drifted === 0 && s.incomplete === 0
      ? green(`all ${s.projects} project${s.projects === 1 ? "" : "s"} in sync`)
      : `${red(`${pluralize(s.drifted, "project")} drifted`)}${
          s.incomplete ? `, ${yellow(`${pluralize(s.incomplete, "project")} incomplete`)}` : ""
        }`;
  log(
    `${bold("envdrift")}: ${verdict} — ${pluralize(s.missing, "missing var")}, ${pluralize(
      s.extra,
      "extra var"
    )}${s.secretLikeVars ? `, ${s.secretLikeVars} secret-like` : ""}`
  );
}

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function gate(reports, flags) {
  if (!flags.ci) return;
  const s = summarize(reports);
  const problems = [];
  if (s.drifted) problems.push(`${s.drifted} drifted project(s)`);
  if (s.incomplete) problems.push(`${s.incomplete} incomplete project(s) (missing .env or .env.example)`);
  if (problems.length) {
    failGate(problems, null);
  }
}

function failGate(problems, jsonMeta) {
  error(`CI gate failed: ${problems.join("; ")}`);
  process.exitCode = 1;
}

export async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  const command = positional[0] || "help";
  try {
    switch (command) {
      case "check":
        await cmdCheck(flags);
        break;
      case "scan":
        await cmdScan(flags);
        break;
      case "init":
        await cmdInit(flags);
        break;
      case "version":
      case "--version":
      case "-v":
        printVersion();
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        break;
      default:
        error(`Unknown command: ${command}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (err) {
    error(err.message || String(err));
    process.exitCode = 1;
  }
}
