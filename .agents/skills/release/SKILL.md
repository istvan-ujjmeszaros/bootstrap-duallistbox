---
name: release
description: >-
  Cut a new bootstrap-duallistbox version on v4 the way previous releases were done (one "vX.Y.Z" bump commit across all manifests and dist banners, annotated vX.Y.Z tag, GitHub release, npm publish of bootstrap4-duallistbox). Use when asked to release, publish, tag or bump the version.
---

# Release

Publishing is irreversible (npm versions can't be reused). Confirm the version number and get the maintainer's go-ahead before tagging, releasing or publishing.

## 1. Preconditions

```shell
git checkout v4 && git pull --ff-only && git status   # clean tree
npm ci && npm test
npx grunt && git status                                # dist must already be current
```

If `grunt` changes `dist/`, a recompile commit was missed: commit it first as `Recompile after merging #<N>` / `Updating distribution files...` (see `land-pr`).

Choose the version (semver): fix → patch, new option/method → minor, breaking → major. List changes since the last tag: `git log --oneline $(git describe --tags --abbrev=0)..HEAD`.

## 2. Bump commit (titled exactly `vX.Y.Z`)

Never edit version numbers by hand; the tool knows every place the version lives (manifests, both version fields of `package-lock.json`, dist banners) and rebuilds `dist/`:

```shell
npm run version:bump X.Y.Z     # refuses if X.Y.Z isn't greater, or if versions already disagree
git diff --stat                # expect only: 4 manifests, package-lock.json, dist/*
git commit -am "vX.Y.Z"
```

If a new file ever starts containing the version, add it to `TARGETS` in `tools/version.js` (`version:check` flags unknown files that mention the current version).

## 3. Tag, push, release, publish

```shell
git tag -a vX.Y.Z -m "vX.Y.Z"          # annotated, "v" prefix (used since v4.0.2)
git push origin v4 vX.Y.Z
gh run watch                             # CI "Release guard" job must pass
gh release create vX.Y.Z --title vX.Y.Z --notes "<bullet list of changes, crediting contributors and PR numbers>"
npm run release:check                    # optional dry run; npm publish runs it anyway
npm publish                              # package: bootstrap4-duallistbox; prepublishOnly re-runs the guard
```

The guard (`tools/release-check.js`) blocks publishing unless: versions agree everywhere, tree clean, on `v4` in sync with origin, annotated tag `vX.Y.Z` on HEAD, HEAD titled `vX.Y.Z`, `npm test` passes, `grunt` leaves `dist/` unchanged, the tarball ships no repo tooling, and the version isn't on npm yet. CI runs the same guard when the tag is pushed — wait for it to go green before `npm publish`. Do not bypass it (`--ignore-scripts`); fix the cause.

npm login is needed on the machine (`npm whoami`); the maintainer may need to enter a 2FA code.

README "History" points to the GitHub Releases list, so the release notes are the changelog; there is no CHANGELOG file.

## Legacy line

For a Bootstrap 3 release (`master`, npm `bootstrap-duallistbox`, 3.x) follow the same steps on `master`.
