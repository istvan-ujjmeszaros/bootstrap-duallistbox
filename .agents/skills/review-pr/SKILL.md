---
name: review-pr
description: >-
  Review a pull request to bootstrap-duallistbox with lint plus before/after behavioural tests (jsdom harness), and report a verdict with a before/after table. Use when asked to review, check or evaluate a PR or a contributor's change.
---

# Review a PR

Goal: a verdict backed by running the same checks against the base branch and the PR. Nothing is posted to GitHub unless the maintainer explicitly asks.

## 1. Gather

```shell
gh pr view <N> --json title,body,author,baseRefName,headRefName,commits,files,mergeable
gh pr diff <N>
git fetch origin <base> pull/<N>/head:pr-<N>
```

- Base should be `v4` (see AGENTS.md → Branches). A PR against `master` is a Bootstrap 3 change; flag it.
- Note the contributor's commit name/email (`commits[].authors`) — needed for `Co-authored-by` if the work is replaced later.

## 2. Static checks (against AGENTS.md conventions)

- Only `src/` changed (plus README/demo for options). Changes in `dist/` → ask to drop them.
- ES5 only, no `console.log`, no debug comments or personal banners.
- Per-instance state kept on `dualListbox`, not `this`/globals inside internal helpers.
- New options: default preserves old behaviour, setter exists, README options+methods and both demo tables updated.
- Public setters with `refresh=true` stay synchronous.

## 3. CI

`gh pr checks <N>` — the GitHub Actions run (lint + tests on Node 20/22/24, dist/ warning). A contributor's first PR may need "Approve and run" in the Actions tab before CI runs.

## 4. Before/after locally

```shell
npm ci
git checkout -q <base>   && npm test
git checkout -q pr-<N>   && npm test       # includes any test suites the PR adds
git checkout -q <base>
```

To compare behaviour precisely, run the baseline harness against both builds of the plugin:

```shell
git show <base>:src/jquery.bootstrap-duallistbox.js > <scratch>/before.js
git show pr-<N>:src/jquery.bootstrap-duallistbox.js  > <scratch>/after.js
node test/harness.js <scratch>/before.js
node test/harness.js <scratch>/after.js '{"someNewOption":500}'   # optional plugin options as JSON
```

The base must pass every baseline check; if it doesn't, fix the harness or note the pre-existing bug before judging the PR. Then write checks for what the PR claims to change (a `test/<feature>.test.js` suite, or ad-hoc with `require('./test/harness')`: `make`, `type`, `box1`, `box2`, `selectIn1`, `wait`). A PR that changes behaviour without adding a test should get one before merging.

## 5. If the PR needs rework

Prefer writing the fix yourself on top of the base branch, verifying it with the same harness and a new `test/*.test.js` suite (`npm test` clean), and saving it as a patch. Contributors aren't asked to rewrite. Landing it is the `land-pr` skill.

## 6. Report

- One-line verdict (merge / merge after fixes / don't merge).
- Before/after table: check | base | PR (| fix).
- Numbered findings, most severe first, each with a concrete failure scenario.
- Ask what to do next: post review on the PR, land a replacement, or nothing.
