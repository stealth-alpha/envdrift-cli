# Demo — real output, captured from this repo

Run against this repository (the fixture in `demo/app` is deliberately drifted):

```console
$ npx envdrift-cli check --dir demo/app

✗ drifted  .
  missing (in .env.example, not in .env):
    - FEATURE_FLAGS
    - LOG_LEVEL
  extra (in .env, not documented):
    + STRIPE_SECRET_KEY [secret-like]
  → 2 missing vars, 1 extra var, 1 secret-like var present

envdrift: 1 project drifted — 2 missing vars, 1 extra var, 1 secret-like
$ echo $?
0
```

(Single-project `check` labels its target `.`; paths appear in `scan` output.)

`scan` walks a tree and labels each project with its path — here the repo root
finds exactly the drifted fixture:

```console
$ npx envdrift-cli scan --dir .

✗ drifted  demo/app
  missing (in .env.example, not in .env):
    - FEATURE_FLAGS
    - LOG_LEVEL
  extra (in .env, not documented):
    + STRIPE_SECRET_KEY [secret-like]
  → 2 missing vars, 1 extra var, 1 secret-like var present

envdrift: 1 project drifted — 2 missing vars, 1 extra var, 1 secret-like
```

Add `--ci` and that same drift exits `1`, failing the step:

```console
$ npx envdrift-cli check --dir demo/app --ci
error: CI gate failed: 1 drifted project(s)
$ echo $?
1
```

The repo itself ships no `.env`/`.env.example` pair at its root (the CLI needs
zero configuration), so `envdrift scan --dir .` reports only the demo fixture —
exactly the incomplete-pair behavior you want from a scanner.
