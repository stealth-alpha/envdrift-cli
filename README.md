# envdrift

**Your `.env.example` is a contract. Nobody reads contracts.**

Every team has one: a `.env.example` that was accurate for about two weeks.
Since then, machines have drifted — a teammate added `REDIS_URL` on their laptop
and never documented it, staging runs with an undocumented `STRIPE_SECRET_KEY`,
and CI passes because nobody checks. Then a deploy fails at 2am because prod
never got `QUEUE_CONCURRENCY`, and everyone diffing `.env` files by hand.

`envdrift` compares `.env.example` against live `.env` files — in one directory
or across a whole tree of projects and machines — and tells you exactly what's
**missing**, what's **extra**, and which undocumented variables look like
**secrets**. It exits non-zero when drift exists, so your CI can be the adult
in the room.

- Zero dependencies. One Node 18+ binary, nothing installed alongside it.
- Never prints variable values — only names and verdicts (safe for logs).
- `scan` walks monorepos and machine checkouts, finding every env pair.
- Secret heuristics flag undocumented vars shaped like keys, tokens, PEMs,
  and connection strings with embedded credentials.
- `--ci` gate mode: green pipeline or a hard stop, your choice.

## Install

```bash
npm install -g envdrift-cli
```

Or run it without installing:

```bash
npx envdrift-cli check
```

## 30-second quickstart

```bash
# In any project with .env + .env.example:
$ envdrift check

✗ drifted  .
  missing (in .env.example, not in .env):
    - FEATURE_FLAGS
    - LOG_LEVEL
  extra (in .env, not documented):
    + STRIPE_SECRET_KEY [secret-like]
  → 2 missing vars, 1 extra var, 1 secret-like var present
```

Audit every project under a directory (a laptop, a server checkout, a monorepo):

```bash
$ envdrift scan --dir ~/code
```

Make it a CI gate:

```bash
$ envdrift scan --ci   # exit code 1 if anything drifted or is incomplete
```

Machine-readable output for scripts:

```bash
$ envdrift check --format json
```

## Configuration

`envdrift` works with zero config. Drop an `envdrift.config.json` in a project
to customize it:

```json
{
  "files": {
    "env": ".env",
    "example": ".env.example"
  },
  "ignore": ["NODE_ENV", "DEBUG"],
  "scan": { "maxDepth": 4 }
}
```

| Key              | Default           | What it does                                  |
| ---------------- | ----------------- | --------------------------------------------- |
| `files.env`      | `.env`            | Live file name to compare                     |
| `files.example`  | `.env.example`    | Documented file name to compare against       |
| `ignore`         | `[]`              | Variable names excluded from all comparisons  |
| `scan.maxDepth`  | `4`               | How deep `scan` walks directories             |

You can also ignore vars per-run: `--ignore NODE_ENV,DEBUG`.

### CLI reference

| Command / flag      | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `check`             | Compare `.env.example` vs `.env` in one directory    |
| `scan --dir <path>` | Walk a tree, report every env pair found             |
| `init`              | Scaffold an `envdrift.config.json`                   |
| `--ci`              | Gate mode: exit 1 on drift or incomplete pairs       |
| `--format json`     | Machine-readable report (names only, never values)   |
| `--silent`          | Summary line only                                    |

## Pro

EnvDrift Pro ($9/month) adds the team layer the free CLI deliberately doesn't
have: a hosted drift dashboard across all your machines and servers, scheduled
audits with Slack/email alerts when a machine starts drifting, secret-name
allowlists shared across your org, and historical reports so you can see who
documented what, when. The CLI stays free and local-first forever; Pro is for
teams who want drift caught before the 2am deploy, not after.

License via Gumroad — link placeholder.

## Development

```bash
npm test        # node:test suite, no dependencies to install
npm start       # run the CLI from source
```

## License

MIT — see [LICENSE](./LICENSE).

---

Part of the [stealth-alpha toolkit](https://stealth-alpha.github.io/toolkit/) — eight zero-dependency CLIs for release automation, agent security, and repo hygiene.
