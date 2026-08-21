import path from "node:path";
import { bold, dim, green, red, yellow, cyan, paint } from "./util.js";

const rel = (p, base) => (base ? path.relative(base, p) || "." : p);

function plural(n, word) {
  if (word === "missing") word = "missing var";
  if (word === "extra") word = "extra var";
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Human-readable report for one project directory. Never prints secret values.
 */
export function formatText(report, baseDir) {
  const lines = [];
  const where = rel(report.dir, baseDir);

  if (!report.hasExample && !report.hasEnv) {
    lines.push(`${yellow("skip")} ${where}: nothing to compare`);
    return lines.join("\n");
  }
  if (!report.hasEnv) {
    lines.push(`${red("✗")} ${where}: ${bold("no .env")} (${plural(report.counts.missing, "documented var")} unset)`);
    for (const m of report.missing) lines.push(`   ${dim("-")} ${m.name}`);
    return lines.join("\n");
  }
  if (!report.hasExample) {
    lines.push(`${yellow("!")} ${where}: no .env.example — cannot verify drift`);
    return lines.join("\n");
  }

  const c = report.counts;
  const verdict = report.ok ? green("✓ in sync") : red("✗ drifted");
  lines.push(`${verdict}  ${dim(where)}`);

  if (c.missing) {
    lines.push(`  ${red("missing")} (in .env.example, not in .env):`);
    for (const m of report.missing) {
      const tag = m.placeholder ? dim(" (placeholder ok)") : "";
      lines.push(`    ${dim("-")} ${m.name}${tag}`);
    }
  }
  if (c.extra) {
    lines.push(`  ${yellow("extra")} (in .env, not documented):`);
    for (const x of report.extra) {
      const tag = x.secretLike ? red(" [secret-like]") : "";
      lines.push(`    ${dim("+")} ${x.name}${tag}`);
    }
  }
  if (c.empty) {
    lines.push(`  ${dim("empty")} in .env:`);
    for (const name of report.emptyInEnv) lines.push(`    ${dim("~")} ${name}`);
  }

  // Summary line — counts only; never echo values of secret-like vars.
  const bits = [
    plural(c.missing, "missing"),
    plural(c.extra, "extra"),
  ];
  if (c.secretLike) bits.push(`${c.secretLike} secret-like var${c.secretLike === 1 ? "" : "s"} present`);
  lines.push(dim(`  → ${bits.join(", ")}`));
  return lines.join("\n");
}

/**
 * Machine-readable JSON for one or many reports.
 * Values are never included — only names and verdicts.
 */
export function formatJson(reports, meta = {}) {
  const list = Array.isArray(reports) ? reports : [reports];
  return JSON.stringify(
    {
      tool: "envdrift",
      ...meta,
      projects: list.map((r) => ({
        dir: r.dir,
        envFile: r.envFile,
        exampleFile: r.exampleFile,
        hasEnv: r.hasEnv,
        hasExample: r.hasExample,
        missing: r.missing,
        extra: r.extra,
        emptyInEnv: r.emptyInEnv,
        secretsInEnv: r.secretsInEnv,
        ignored: r.ignored,
        ok: r.ok,
      })),
      summary: summarize(list),
    },
    null,
    2
  );
}

export function summarize(reports) {
  const list = Array.isArray(reports) ? reports : [reports];
  const s = {
    projects: list.length,
    ok: 0,
    drifted: 0,
    incomplete: 0,
    missing: 0,
    extra: 0,
    secretLikeVars: 0,
  };
  for (const r of list) {
    if (!r.hasEnv || !r.hasExample) s.incomplete++;
    else if (r.ok) s.ok++;
    else s.drifted++;
    s.missing += r.counts?.missing ?? r.missing.length;
    s.extra += r.counts?.extra ?? r.extra.length;
    s.secretLikeVars += r.secretsInEnv.length;
  }
  return s;
}

export { paint, bold, dim, green, red, yellow, cyan };
