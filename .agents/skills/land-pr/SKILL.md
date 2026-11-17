---
name: land-pr
description: >-
  Merge a pull request into bootstrap-duallistbox's v4 branch the way the maintainer always has (GitHub merge commit, then a separate "Recompile after merging #N" dist commit), including replacing a contributor's PR with a maintainer rewrite that credits them. Use when asked to merge, land, supersede or finish a PR.
---

# Land a PR

Every step here is public (push, merge, comment). Get the maintainer's explicit go-ahead first and confirm what will be posted.

## A. Contributor PR is good as-is

1. Review it first (`review-pr` skill) unless that was just done.
2. Wait for CI to be green (`gh pr checks <N> --watch`), then merge on GitHub with a **merge commit** (history uses "Merge pull request #N from …", never squash/rebase):
   `gh pr merge <N> --merge`
3. Recompile `dist/` on `v4`:
   ```shell
   git checkout v4 && git pull --ff-only
   npm ci && npx grunt          # jshint + concat + uglify + cssmin
   git add dist && git commit -m "Recompile after merging #<N>"
   git push origin v4
   ```
   Commit only `dist/` changes. If `grunt` changes nothing in `dist/` (e.g. a README-only PR), skip the commit.

## B. Replace a contributor's PR with a maintainer rewrite

Used when the idea is right but the code needs rework; the contributor is not asked to redo it.

1. Branch from `v4`: `git checkout -b <short-topic> origin/v4`.
2. Apply the fix to `src/` only. If it adds an option, also update README (options + methods lists) and both tables in `demo/index.html` (AGENTS.md → Code conventions). Do not touch `dist/`.
3. Verify: add a `test/<feature>.test.js` suite for the change (new options tested both off and on); `npm test` clean.
4. Commit with a credit trailer using the contributor's name/email exactly as on their PR commit:
   ```
   <Imperative summary>

   <Why; what was wrong with the original approach in one or two sentences.>
   Based on the idea in #<N>.

   Co-authored-by: <Their Name> <their@email>
   ```
5. Push the branch and open a PR (or, if the contributor allowed maintainer edits, push the fix as extra commits onto their PR branch — merge `v4` into it rather than rebasing, never force-push someone else's branch) to `v4` whose description credits #<N>, summarises the fix and includes the before/after table.
6. Comment on #<N>: thank them, explain briefly why it's superseded (findings, not blame), link the new PR, invite them to try it on their data.
7. After the replacement is merged: do step A.3 (recompile commit, referencing the new PR number), then close #<N> (`gh pr close <N> --comment "Superseded by #<M>, thanks!"`).

## C. Maintainer's own fix (no PR)

Matches history (e.g. `Fixes #160`): commit `src/` changes on `v4` with a message like `Fixes #<issue>`, then a separate commit `Updating distribution files...` with the grunt output.

Releasing is a separate step (`release` skill); landing a PR does not bump the version.
