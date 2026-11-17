# Bootstrap Dual Listbox

jQuery plugin that turns a `<select multiple>` into two side-by-side lists ("non-selected" / "selected") with filter inputs and move/remove buttons. Single-file plugin, no runtime dependencies besides jQuery and Bootstrap CSS.

## Branches

- `v4` — **default and active branch** (Bootstrap 4). npm package `bootstrap4-duallistbox`. PRs target `v4`.
- `master` — legacy Bootstrap 3 line (v3.x, npm `bootstrap-duallistbox`). Only touch it when a fix is explicitly meant to be backported.
- `dependabot/*` — automated dependency bumps (lockfile only).

## Layout

- `src/jquery.bootstrap-duallistbox.js` — the plugin. **All code changes go here.**
- `src/bootstrap-duallistbox.css` — styles.
- `dist/` — build output (`grunt`). Never edited by hand and never included in feature/contributor PRs (see CONTRIBUTING.md).
- `demo/index.html` — demo page **and** a second copy of the options/methods reference tables.
- `README.md` — "Initialization parameters object" and "Methods" sections document every option and setter.
- `test/` — behaviour tests in jsdom: `harness.js` (fixture + baseline checks), `run.js` (runner), `*.test.js` (feature suites).
- `tools/version.js` — the list of every file carrying the version number; `check` / `bump X.Y.Z`. Never edit version numbers by hand.
- `tools/release-check.js` — release guard, runs on `npm publish` (prepublishOnly) and in CI on `v*` tags.
- `.github/workflows/ci.yml` — GitHub Actions: lint + tests on push/PR (Node 20/22/24), dist/ freshness warning on `v4`, release guard on tags.
- `.npmignore` — keeps repo tooling (`test/`, `tools/`, `.agents/`, `.github/`, …) out of the npm package.

## Code conventions

- **ES5 only** (no template literals, `let`/`const`, arrow functions). jshint has no `esversion` set and will fail on ES6.
- 2-space indent, single quotes, semicolons, LF, trailing newline (`.editorconfig`, `.jshintrc`). jQuery Core style guide per CONTRIBUTING.md.
- No `console.log` left in source (it was removed once already in #170).
- The file is **not** in strict mode, and internal helpers (`filter`, `refreshSelects`, `move`, …) are plain functions taking `dualListbox` as first argument. Inside them `this` is `window` — store per-instance state on `dualListbox`, never on `this`.
- New options need all of: a default in `defaults`, a `setXxx(value, refresh)` method, a call to it in `init`, a README entry in both the options and methods lists, and rows in the two tables in `demo/index.html`. New options must default to the existing behaviour.
- Public setters with `refresh = true` must update the UI synchronously; callers rely on reading the result right after.

## Commands

```shell
npm ci                       # install dev deps
npm test                     # jshint + behaviour tests — same as CI; must pass before any PR/merge
npm run build                # grunt: jshint + concat + uglify + cssmin -> dist/
npm run version:check        # every version occurrence agrees
npm run version:bump X.Y.Z   # bump all occurrences + rebuild dist (release only)
npm run release:check        # full release guard (also runs automatically on npm publish)
node test/harness.js <file>  # baseline checks against any build of the plugin (before/after comparisons)
```

A behaviour change needs a test: add a `test/<feature>.test.js` suite (see `test/run.js` for the interface). If a check guards a whole class of regression, add it to `baseline()` in `test/harness.js`.

## Maintainer workflow (derived from git history)

1. **Contributor PRs** change `src/` (plus README/demo for new options) only. Merged on GitHub with a merge commit ("Merge pull request #N from …").
2. **After merging**, the maintainer runs `npx grunt` and commits only the dist JS/CSS changes on `v4` as a separate commit: `Recompile after merging #N` (also seen: "Updated dist after merge.").
3. **Maintainer's own fixes**: a `src/` commit (e.g. `Fixes #160`), then a separate `Updating distribution files...` commit.
4. **Release**: one commit titled `vX.Y.Z` bumping the version everywhere (`npm run version:bump`), an annotated tag `vX.Y.Z` (message `vX.Y.Z`; tags before 4.0.2 had no `v`), a GitHub release, and `npm publish` (guarded by `tools/release-check.js`).

Follow the step-by-step procedures in `.agents/skills/<name>/SKILL.md` so this stays consistent; read the relevant one before starting the task:

- `review-pr` — review a PR with before/after behavioural tests.
- `land-pr` — merge a PR (or a maintainer replacement of one) and recompile `dist/`.
- `release` — cut a version: bump, rebuild, tag, GitHub release, npm publish.

## Etiquette with contributors

- When a contributor's PR has the right idea but needs a rewrite, the maintainer does not ask them to redo it: land a replacement PR, credit them with a `Co-authored-by:` trailer using the name/email from their PR commit, link their PR, and close theirs with a thank-you comment once the replacement is merged.
- Never post PR comments, push, merge, tag or publish without the maintainer's explicit go-ahead.
- Don't merge while CI is red.
