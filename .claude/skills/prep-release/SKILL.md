---
name: prep-release
description: |
  Runs an entire release event for this package: triages every open PR into
  a quality/risk-rated merge recommendation, waits for the user's sign-off,
  squash-merges the chosen PRs, writes the release's changelog and version
  bump plus a whole-package security red-team on its own release branch,
  validates that branch with the full lint/typecheck/test/build/bundle/a11y
  gate, then opens a single release-prep PR for the user's final review.
  Never merges that PR, tags, or publishes. Use when the user types
  /prep-release, asks to "prep a release", "cut a release", "release
  checklist", or wants the open PRs triaged and merged into a release.
user_invocable: true
version: 1.0.0
---

# Prep Release

Five phases, run in order. This is a whole-release audit, not a
single-branch review — Phase 3 onward operates on the whole `src/` tree and
everything merged since the last tag, not just one diff. For an iterative
diff-scoped review during normal development, use `/loop-review` instead;
this skill is for the release event itself.

coolhand-js is a browser feedback widget published to npm as `coolhand` and
built with webpack into a UMD bundle (`dist/coolhand.js`,
`dist/coolhand.min.js`, plus source maps). It has no server component, no
live-key example scripts, and no `sync-version` script: the version string
is injected at build time from `package.json` (`__COOLHANDJS_VERSION__` in
`webpack.config.mjs`), and a few docs hardcode it (see "Finalize the
version").

Per `AGENTS.md`, feature/fix branches never touch `CHANGELOG.md` or
`package.json`'s `version` field — this skill is the only place those get
written. If a chosen PR's diff does touch either file, treat it as a normal
part of that PR's diff (don't strip it), but don't let it change how
Phase 3 writes its own entry — Phase 3's changelog write-up is authoritative
regardless of what an individual PR's diff already contains.

## Phase 1: Survey open PRs, recommend a release set

1. `gh pr list --state open --json number,title,author,isDraft,mergeable,mergeStateStatus,statusCheckRollup,additions,deletions,changedFiles,body,headRefName`
   — `statusCheckRollup` already gives CI status per PR (lint, and test on
   Node 18/20/22), so there's no need for a separate `gh pr checks <n>`
   call per PR.
2. For each PR, pull `gh pr diff <n>` — these are independent, read-only
   lookups across PRs, so issue them concurrently rather than one PR at a
   time — and rate two independent axes:
   - **Quality** (High/Medium/Low): does the diff include test coverage
     proportional to the `src/` change (tests live in `test/`; UI changes
     should extend `test/accessibility.test.ts` where relevant), is the
     code consistent with `AGENTS.md` and the ESLint/Prettier config, does
     the PR description read as complete work rather than a stub or "WIP,
     not ready" note.
   - **Risk** (High/Medium/Low): does it touch a security-, isolation-, or
     public-surface-critical path — `src/cookie.ts` (fingerprint cookie),
     `src/coolhand-feedback.ts` (init/attach/detach and the auto-attach
     MutationObserver), `src/feedback-widget.ts` and
     `src/partial-feedback-widget.ts` (`innerHTML` rendering and the
     `fetch` calls to the feedback API), `src/partial-feedback-manager.ts`
     (persisted state), `src/types.ts` / `src/index.ts` (public API),
     `webpack.config.mjs`, `package.json`, or `.github/workflows/` — weight
     those higher regardless of size; failing CI checks or a non-clean
     `mergeable` state also push risk up; an isolated additive feature or a
     docs-only change is lower risk.
   - **Dependabot PRs** (author `app/dependabot`) are rated as a class: a
     green patch/minor bump of a dev dependency is low risk; a major-version
     bump (e.g. eslint, webpack-dev-server, a GitHub Action) or any bump
     with failing or cancelled checks is high risk — read the failing log
     before recommending it, since a red Dependabot PR usually means a real
     incompatibility (peer-dependency conflict, toolchain break) rather than
     flakiness. Note that GitHub Actions in `.github/workflows/` are pinned
     by commit SHA with a version comment; a Dependabot action bump changes
     what runs in the release pipeline itself, so read what changed. After
     one Dependabot PR merges, others touching `package-lock.json` will
     often conflict; the fix is a `@dependabot rebase` comment, which you
     should suggest to the user rather than post yourself.
3. Present one table: PR number, title, quality, risk, CI status,
   mergeable state, and a one-line recommendation (include / exclude /
   needs work before it can be considered). Call out anything that looks
   unfinished — draft, a WIP-sounding title, failing checks, an empty or
   placeholder description, visible `TODO`/`FIXME` in the diff — as
   "exclude, not ready" rather than rating it neutrally.
4. Stop here and ask the user which PRs to include in this release — do
   not merge, write changelog entries, or touch `package.json`'s version
   until the user answers. (The red-team in Phase 3 has its own planned
   stop for findings that are a behavior/architecture decision rather than
   a safe mechanical fix; this step is the first planned stop, not the
   only one.)

## Phase 2: Merge the chosen PRs

Process the user's chosen PRs one at a time, not as a batch:

1. Before each merge, re-check that PR's `mergeable`/`mergeStateStatus`
   (`gh pr view <n> --json mergeable,mergeStateStatus`) — an earlier merge
   in this same run can newly conflict a later one. If a chosen PR now
   conflicts, skip it, note it in the running list as "skipped — needs
   rebase," and continue with the rest. Don't resolve conflicts on someone
   else's branch unilaterally.
2. `gh pr merge <n> --squash --delete-branch` for each surviving PR.
3. Immediately after *every* merge — including the last one in the
   batch, not just as prep for evaluating a next PR — sync local `main`.
   First check `git status --porcelain` — if it's not empty, stop and
   surface it to the user rather than discarding unknown local state. Also
   check `git log origin/main..main --oneline` — if that's non-empty,
   `main` carries local commits `origin/main` doesn't have (a manual
   hotfix, or a prior `/prep-release` run that committed to `main` and was
   interrupted); stop and surface those commits too rather than silently
   discarding them. Only when both checks are empty is `git fetch origin
   main && git checkout main && git reset --hard origin/main` safe — it
   then only overwrites a working tree and branch pointer that carry
   nothing `origin/main` doesn't already have.

   (In a Conductor workspace `main` may already be checked out in another
   worktree, which makes `git checkout main` fail. In that case work from
   `origin/main` directly — `git fetch origin main` and create the release
   branch with `git checkout -b release/vX.Y.Z origin/main` — and skip the
   local-`main` reset.)

Keep a running list of what actually merged vs. what got skipped — Phase 5
reports both.

## Phase 3: Build the release branch — docs/changelog/version + red-team

### Determine the version, then create the branch

1. If Phase 2 merged at least one PR, `main` is already synced from that
   step's last iteration — don't redo the fetch/checkout/reset. Otherwise
   (the user chose zero PRs, or every chosen PR was skipped for a
   conflict), Phase 2's sync never ran this run, so sync local `main` to
   `origin/main` now, using the same clean-working-tree and
   no-unpushed-commits checks as Phase 2 step 3 — everything below would
   otherwise operate against a stale local `main`.
2. Find the last release tag: `git describe --tags --abbrev=0`.
3. Diff **everything since that tag** on the now-updated `main` —
   `git log <last-tag>..HEAD --oneline` and `git diff <last-tag>..HEAD -- src/`
   (also `-- webpack.config.mjs package.json .github/`) — not just the PRs
   this run merged in Phase 2. `main` can carry unreleased changes Phase 2
   never touched (a hotfix committed directly, a PR merged manually outside
   this skill, or a prior `/prep-release` run that merged PRs but was
   interrupted before finishing this phase); all of those still need a
   changelog entry, so treat this diff, not Phase 2's merge list, as the
   source of truth for what's covered.
4. Determine the SemVer bump that diff implies (patch = fix, minor =
   backward-compatible addition or breaking change while pre-1.0, major =
   breaking change once the package is at 1.0.0 or later; this package is
   currently pre-1.0). What counts as breaking here is the public surface:
   the default export of `src/index.ts` / the `CoolhandJS` UMD global,
   exported types in `src/types.ts`, option names and defaults, the
   `data-coolhand-*` attributes, and the bundle filenames the README's
   CDN/release URLs reference. Check `package.json`'s current `version`
   against the last tag as a defensive sanity check in case something
   bumped it out of band: if it's behind the last tag (e.g. a manual
   revert after tagging), that's a corrupted state — stop and surface it
   to the user rather than guessing which version is correct. If it's
   already ahead of the last tag, don't just adopt it verbatim — a PR
   bumping its own version (a rule violation the preamble says not to
   strip) may only reflect *that PR's* bump type, not the highest bump the
   full accumulated diff implies. Compare the already-ahead version
   against the version you'd compute from the diff yourself; use whichever
   is higher, and treat a mismatch as worth flagging in the Phase 5 report
   (an under-versioned bump shipping is a real risk, not just pedantry).
   If the diff since the last tag is empty (no chosen PRs and no other
   unreleased changes), there is no bump yet — use a provisional `X.Y.Z`
   one patch above the last tag for the branch name below; the "Finalize
   the version" step re-derives the real bump once the red-team has run,
   and if that differs from this provisional number, rename the branch
   (`git branch -m`) and the not-yet-opened PR to match before Phase 5.
5. Create `release/vX.Y.Z` off the now-synced `main` using that version
   number. If a branch with that name already exists, that's the
   corroborating signal that a prior `/prep-release` run got partway
   through Phase 3 or later and was interrupted — a coincidentally
   matching `## [X.Y.Z]` heading in `CHANGELOG.md` alone isn't enough
   (e.g. a chosen PR could have added its own heading for a version that
   happens to match what this run also computed; the preamble says not to
   strip that, but it doesn't make it this skill's own in-progress work).
   If the branch exists:
   - First check `gh pr list --head release/vX.Y.Z --state all` — an
     existing PR (even a closed/merged one from a prior run) is a much
     stronger signal than the CHANGELOG heading alone that this is
     genuinely this skill's own prior work, not a coincidence.
   - Check out the branch instead of recreating it, then reconcile it
     against `main`: `git log release/vX.Y.Z..main` — if non-empty, `main`
     picked up changes (a hotfix, another merged PR) after this branch was
     created that the branch doesn't have yet, in `src/` or elsewhere (a
     doc-only or changelog-only PR merged during the gap is exactly as easy
     to silently drop as a `src/` change, and Phase 5 has no other check
     that would catch it). Merge or rebase those in before continuing, or
     the release would silently ship without them.
   - Use `CHANGELOG.md`'s state *on that branch* to pick up where it left
     off: an `[Unreleased]` heading still open means "Docs, changelog,
     version" and/or the red-team below are incomplete — continue them,
     treating entries already present as done rather than re-adding them;
     a heading already closed to `## [X.Y.Z]` means "Finalize the
     version" already ran — skip straight to Phase 4.
   - If it's ambiguous which state the branch is in, stop and ask the
     user rather than guessing and risking a duplicate heading or
     duplicate changelog entries.
   Otherwise (no existing branch), do all of the following as commits on
   the new branch — never on `main` directly.

### Docs, changelog, version

1. For each change identified above, check it's reflected in the
   following — these are independent, read-only checks against different
   files, so do them as a batch rather than one at a time:
   - `CHANGELOG.md` — exactly one entry per change under an `[Unreleased]`
     heading (add one at the top, above the last version heading, if the
     file doesn't already have one — this repo's `CHANGELOG.md` currently
     goes straight from the header into `## [X.Y.Z] - YYYY-MM-DD` entries),
     in Keep a Changelog format matching this repo's existing entries:
     plain `### Added` / `### Fixed` / `### Changed` / `### Documentation`
     headings, no emoji. Add `### Security`, `### Deprecated`, or
     `### Breaking Changes` when a change calls for it, and fold
     dev-dependency and CI-action bumps into a single `### Internal`
     bullet (they don't change the shipped bundle) rather than one line per
     bump. Look at more than just the latest release's headings before
     picking a category. Write plain-English migration notes for anything
     behavior-affecting. Attribute each entry to its PR number where one
     exists, as `(#NN)`: check Phase 2's merge list first, then fall back
     to the squash-merge commit message (`git log --grep`, which carries
     the PR number in its title) for anything not merged in this run. If a
     change genuinely has no discoverable PR (a direct commit to `main`),
     write the entry without one rather than skipping it. If a merged PR's
     diff already added its own `CHANGELOG.md` entry (the preamble above
     says not to strip it), fold it into — don't duplicate alongside — the
     one authoritative entry you write here for that change, so a change
     never ends up with two entries describing it.
   - `README.md` / `docs/*.md` — any new option, public method,
     `data-coolhand-*` attribute, or behavior change needs the relevant
     section updated. Sweep every file under `docs/` (`attaching.md`,
     `auto-highlight.md`, `feedback-api.md`, `fingerprinting.md`,
     `styling.md`, `typescript.md`, `widget-placement.md`), not just the
     ones obviously related to this release's changes — a doc that
     describes Coolhand *backend* behavior (`docs/feedback-api.md`'s
     payload/field table and endpoints) can drift independently of
     anything in this repo's own commit history, so spot-check a sample of
     such claims against the published Coolhand API docs on
     coolhandlabs.com rather than assuming prose that's been sitting in
     the repo is still accurate. Follow this repo's docs philosophy from
     `AGENTS.md`: the README stays a scannable landing page; anything
     needing more than one code block belongs in `docs/` and is linked from
     the README's `## Documentation` section; the auto-attach
     "never retries an already-scanned element" limitation must still be
     documented in `docs/attaching.md`. Also confirm the README/package
     description keeps the keyword-rich terms from `AGENTS.md`'s
     Discoverability section.
   - `AGENTS.md` and `CONTRIBUTING.md` themselves — the commands listed
     should still exist in `package.json` `scripts` (for instance, confirm
     every `npm run` script named in `AGENTS.md`'s "Running individual
     tools" list is actually defined) and the release instructions should
     still match `.github/workflows/publish.yml` and `release.yml`.
2. **Cross-SDK alignment.** Per `AGENTS.md`, the README/docs structure
   should match [coolhand-node](https://github.com/Coolhand-Labs/coolhand-node)
   and [coolhand-ruby](https://github.com/Coolhand-Labs/coolhand-ruby). Check
   whether any structural change since the last tag (a new README section,
   a change to the Documentation section format, a new `docs/` pattern, a
   new configuration option that has an equivalent there) got a companion
   issue/PR on those repos. This re-checks the whole range since the last
   tag, not just what `/loop-review` saw per-PR, so it also catches a
   direct commit to `main` or a PR merged outside the normal review flow.
   If one is missing, flag it in the Phase 5 report rather than filing it
   yourself.
3. **Clean, don't just append.** Look for docs that are now stale,
   contradictory, or redundant given the accumulated changes since the
   last tag — consolidate/rewrite rather than layering a new paragraph on
   top of an outdated one. Remove docs for anything removed from the
   package.

Leave the `[Unreleased]` CHANGELOG heading open (don't finalize it into a
version heading yet) — the red-team below can still add its own entries,
and "Finalize the version" after it is what closes the heading.

### Red-team

Adversarially review the entire `src/` tree (not just what merged in
Phase 2) for security issues. Read the code fresh for this pass rather
than relying on impressions formed while triaging PRs in Phase 1 — a
PR that looked fine for merge-worthiness isn't the same question as
"does this code have a security bug," and no finding should be reported
without pointing at the actual file/line that shows it, re-confirmed
against that file/line as it stands right now rather than a paraphrase
carried over from an earlier phase. This package runs inside arbitrary
third-party pages, renders HTML from strings, stores a fingerprint cookie,
and posts user feedback (including the text of the AI output being rated)
to a configurable endpoint, so hunt specifically for:

- **XSS / DOM injection**: every `innerHTML` (and `insertAdjacentHTML`,
  `outerHTML`, `document.write`) site — in `feedback-widget.ts`,
  `partial-feedback-widget.ts`, and anything under `src/icons/` /
  `src/styles/` — traced back to where each interpolated value comes from.
  Host-page attribute values (`data-coolhand-*`), option values, the
  rated element's own text or HTML, region/partial-feedback text, and API
  responses are all attacker-influenceable on a page that embeds
  user-generated or LLM-generated content. Anything not escaped or set via
  `textContent` is a finding. Also check that the selected-text/partial
  feedback path can't be tricked into serializing markup as content.
- **Data exfiltration via `apiUrl`**: the `apiUrl` option (and any
  per-widget override) redirects where feedback payloads and update
  requests go. Confirm feedback IDs interpolated into `${apiUrl}/${id}`
  paths can't smuggle path segments or query strings, that nothing beyond
  the documented payload (and no cookie/credential the page didn't already
  intend to share) is sent, and note whether a non-https `apiUrl` is
  accepted silently.
- **Fingerprint cookie** (`src/cookie.ts`, documented in
  `docs/fingerprinting.md`): `Secure`, `SameSite`, `Max-Age`/expiry and
  `Path` set as documented; the value is validated after `JSON.parse`
  rather than trusted (any script on the page can write a same-name
  cookie); no more identifying data is collected than documented; a
  cookie-blocked or non-HTTPS context degrades instead of throwing.
- **Persisted state** (`partial-feedback-manager.ts` `localStorage`):
  corrupt, truncated, oversized, or wrong-shaped stored JSON must not crash
  the host page or feed unvalidated values into rendering.
- **Unsafe input parsing / prototype pollution**: `JSON.parse` of
  attribute or storage values without a shape check, object merges of
  caller-supplied option objects (`__proto__`, `constructor`,
  `prototype` keys), and any `new RegExp` built from attribute or option
  values (ReDoS: nested quantifiers, overlapping alternation).
- **Secrets and PII in logs**: `console.*` calls (there are intentionally
  some `console.debug` skips in auto-attach) that print payload contents,
  identifiers, or API responses.
- **Fail-open vs. breaking the host page**: when the feedback API is
  unreachable, slow, returns a non-2xx, or returns malformed JSON, the
  widget must degrade visibly to the user without throwing an unhandled
  rejection into the host page or leaving a stuck/disabled control. Also
  check that `init()`/`attach()`/`detach()` are safe to call twice and in
  non-browser (SSR) contexts where `window`/`document` don't exist.
- **Host-page interference**: the UMD bundle must not leak globals beyond
  `CoolhandJS`, must not leak styles across the shadow DOM boundary
  (`docs/styling.md`), must not steal focus or trap keys outside its own
  UI, and the auto-attach MutationObserver must not do unbounded work per
  mutation or fail to disconnect on `detach()`.
- **Supply chain & release pipeline**: `.github/workflows/*.yml` — actions
  still pinned by commit SHA, `permissions:` still least-privilege
  (`id-token: write` only on the publish job), `publish.yml` still
  publishes with `--provenance --ignore-scripts` from the verified build
  artifact, and no new workflow step interpolates untrusted event data
  (PR titles, branch names) into a `run:` script. Check `package.json`
  `dependencies` (the package should have none at runtime) and that no
  install-time `scripts` (`postinstall` etc.) have appeared.

For each finding, report file, line, a concrete failure scenario, and
severity. Apply safe, mechanical, low-risk fixes directly, as commits on
`release/vX.Y.Z` — a fix counts as safe/mechanical only when it closes a
gap in an existing, already-established mechanism using its existing
pattern (e.g. routing an unescaped interpolation through an escaping
helper that sibling call sites already use, or adding a missing shape check
to a parse that its neighbours already guard) — and give each one its own
`### Security` entry under the still-open `[Unreleased]` heading, the same
as any other change. Flag but do not silently apply anything that changes
a mechanism's own logic or defaults rather than closing a gap in it —
changing what `apiUrl` accepts (e.g. rejecting non-https), changing cookie
attributes or lifetime, changing what data is collected, or anything else
that's a behavior/architecture decision — surface these to the user for a
decision, the same "hand it to a human" rule `/loop-review` uses for stuck
findings; a flagged-not-fixed finding doesn't get a changelog entry since
it didn't ship.

### Finalize the version

Now that both regular changes and any red-team fixes have their
`CHANGELOG.md` entries, re-check the SemVer bump from "Determine the
version" above against what actually shipped: a red-team fix adds at
least a patch-level change, so if this run started from zero chosen PRs
and no other unreleased diff (the provisional patch-bump branch name from
step 4), confirm the real bump is at least that provisional patch level,
and any red-team fix categorized as a breaking behavior change needs the
same pre-1.0 vs. 1.0+ major/minor check Phase 3 step 4 already applies.
If the confirmed `X.Y.Z` differs from the branch's provisional name,
rename the branch (`git branch -m release/v<old> release/v<new>`) before
continuing. Then:

1. Write `X.Y.Z` to `package.json`, and run `npm install --package-lock-only`
   so `package-lock.json`'s top-level `version` fields match too. (There is
   no `src/version.ts`: `webpack.config.mjs` injects the version from
   `package.json` at build time.)
2. Turn the `[Unreleased]` heading into `## [X.Y.Z] - <today's date>`.
3. Update every hardcoded copy of the old version. Find them with
   `grep -rn "<old-version>" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude=package-lock.json`
   and update each one that refers to *this package's* version. At the
   time of writing that is `README.md` (the jsDelivr CDN pin and the
   GitHub release-download URL in the install section, and the
   `CoolhandJS.version` / SDK-version examples) and `docs/feedback-api.md`
   (the example payload's `"collector": "coolhand-js-<version>"`). Do not
   rewrite historical `CHANGELOG.md` entries, and leave the unpinned
   `cdn.jsdelivr.net/npm/coolhand/...` URL unpinned.

## Phase 4: Validate the release branch

1. Run `npm run lint && npm run typecheck && npm test` on `release/vX.Y.Z`
   — this mirrors CI's `lint` and `test` workflows and is the same gate
   `AGENTS.md` requires before any commit. Also run `npm run format:check`.
   Then run `npm run build` and confirm it succeeds (it produces both the
   unminified and minified bundles), and run the two checks `AGENTS.md`
   says belong before a release and aren't part of the default gate:
   `npm run test:bundle` (smoke-tests the built `dist/coolhand.min.js` in a
   `vm` context — this is what actually validates the artifact that ships,
   not just the source) and `npm run test:a11y` (the jest-axe suite). All
   of lint, typecheck, tests, format, build, bundle smoke test, and a11y
   must be clean before continuing — a release doesn't ship on a red
   build. If any fail, fixing genuine bugs on `release/vX.Y.Z` (the same
   disposable-branch commit privileges Phase 3 already uses) takes
   priority over the rest of this phase and Phase 5; if the failure isn't
   a safe, mechanical fix — it's unclear what broke, or fixing it would
   itself be a behavior/architecture decision — stop here and report the
   failures instead of guessing.

2. **Verify the artifacts the release pipeline depends on.** After
   `npm run build`, confirm `dist/coolhand.js`, `dist/coolhand.js.map`,
   `dist/coolhand.min.js`, and `dist/coolhand.min.js.map` exist (these are
   attached to the GitHub Release by `release.yml`, and
   `package.json`'s `main` points at `dist/coolhand.js`), and that
   `dist/index.d.ts` exists, because `package.json`'s `types` field points
   at it — a missing declaration file would publish a package whose
   TypeScript types don't resolve. Run `npm pack --dry-run` and confirm
   the tarball contains `dist/`, `package.json`, `README.md`, and
   `LICENSE` and nothing that shouldn't ship (`localhost*.pem`, `.env`,
   `test/`, `.context/`). Confirm the built bundle reports the new
   version (`node -e "..."` against `dist/coolhand.js`, or grep for the
   version string) so a stale build can't be mistaken for the release.

3. Run `npm audit` (full, not just `--omit=dev`) and note anything
   high/critical — CI's `lint.yml` only runs `npm audit --omit=dev
   --audit-level=high`, so this is the one point that also catches a
   high/critical vulnerability in a dev-only dependency (a build-toolchain
   compromise is still a release risk) before it ships.

4. Judge coverage on quality, not just the `npm run test:coverage`
   percentage: `jest.config.mjs` enforces global and per-file thresholds
   (with deliberately low floors for `partial-feedback-manager.ts` and
   `partial-feedback-widget.ts`), so a green run doesn't mean those files
   are well tested. Find the gaps and weight by risk (an uncovered
   error-handling, storage-parse, cookie, or `innerHTML` branch matters
   more than an uncovered getter); audit existing tests for
   meaningfulness, not just count (flag tests that only assert a mock
   returns what it was mocked to return, missing negative/error-path cases
   such as a failed `fetch` or corrupt `localStorage`, missing edge cases
   like empty content or repeated `attach()`); recommend specific tests
   for the highest-risk gaps, named by `file:describe/it` — don't add
   tests purely to move the percentage.

5. **Accessibility review.** Launch the `a11y-release-reviewer` agent
   (`.claude/agents/a11y-release-reviewer.md`) over the diff since the last
   tag. It fixes low-risk issues itself; fold what it fixed into the
   changelog under `### Fixed`, and carry anything it flags-not-fixes into
   the Phase 5 report.

6. **Optional browser smoke test.** This repo has no live-key example
   scripts (node's equivalent step), but `examples/index.html`,
   `examples/simple.html`, and `examples/demo.html` exercise the real
   bundle in a real browser, which jsdom tests can't fully cover
   (rendering, shadow DOM styling, cookies). If browser tooling is
   available, start `npm run dev` (serves `http://localhost:3333`, run it
   in the background), load each example, confirm the widget renders,
   opens, and submits without console errors, then **stop the dev server
   before continuing** — don't leave it running. Fingerprint-cookie
   behavior needs the HTTPS setup in `CONTRIBUTING.md`; if that isn't set
   up, say the cookie path wasn't exercised. If no browser tooling is
   available, say explicitly in the Phase 5 report that this step was
   skipped rather than silently omitting it — it's a gap to flag, not
   something to paper over.

## Phase 5: Open the release-prep PR, report everything

1. Push `release/vX.Y.Z` and `gh pr create --base main` (e.g. "chore:
   release vX.Y.Z"). This PR is the user's final checkpoint before the
   changelog/version/red-team commits land — never merge it, tag it, or
   run `npm publish`/push a `v*` tag yourself (a tag push is what triggers
   both `.github/workflows/publish.yml`'s npm Trusted Publishing flow and
   `.github/workflows/release.yml`'s GitHub Release).
2. Report one consolidated summary covering the whole run:
   - Phase 1's PR table and which PRs the user chose.
   - Phase 2's outcome: which PRs merged, which were skipped for new
     conflicts (and need a rebase — for Dependabot PRs, a
     `@dependabot rebase` comment — before the next release).
   - The release-prep PR link, the version bump and why.
   - Coverage-quality gaps plus recommended tests.
   - Docs updated, and whether a companion issue/PR is needed and missing
     on coolhand-node or coolhand-ruby.
   - Red-team findings split into fixed vs. flagged-for-decision.
   - Phase 4's lint/typecheck/test/format/build/bundle/a11y result, the
     artifact and `npm pack --dry-run` check, the `npm audit` result, the
     `a11y-release-reviewer` outcome, and the browser smoke test result
     (pass/fail/skipped).
   - A clear go/no-go verdict for this release, with the blocking items
     listed if no-go (e.g. a flagged-not-fixed red-team finding, a failing
     a11y or bundle check, a missing `dist/index.d.ts`, or a missing
     companion issue) — don't leave the user to infer readiness from the
     bullet points above on their own.
   - A reminder of the concrete next step, since this skill stops short of
     it: once the user reviews and merges the Phase 5 PR, tagging and
     publishing are their action — `git tag vX.Y.Z && git push origin
     vX.Y.Z` pushes only the new tag (plain `--tags` pushes every local
     tag, including any stray one from an aborted prior release attempt,
     which would trigger its own publish run). The tag push triggers
     `publish.yml` (build, verify tag == `package.json` version, then an
     OIDC Trusted Publishing `npm publish --provenance` from the
     `npm-publish` environment, which may wait for approval in the Actions
     UI) and, independently, `release.yml` (the GitHub Release with
     `dist/coolhand*.js` attached). No local `npm publish` is needed or
     wanted.

## Safety

- Bumping `package.json`'s version, running `npm install --package-lock-only`,
  updating hardcoded version strings in the README/docs, and finalizing the
  CHANGELOG heading are all in scope and don't need a stop-and-ask —
  they're mechanical and reversible, being commits on a disposable
  `release/vX.Y.Z` branch rather than `main`. They happen in Phase 3,
  before Phase 4 validates the branch; it's opening the Phase 5 PR that's
  gated on Phase 4 being green, not the Phase 3 commits themselves.
- Squash-merging PRs the user explicitly chose in Phase 1, and pushing the
  `release/vX.Y.Z` branch to open its own PR, are both in scope.
- Fixing a genuine lint/typecheck/test/build failure found in Phase 4,
  as a commit on `release/vX.Y.Z`, is also in scope — same disposable-
  branch reasoning as the Phase 3 mechanical commits above — but only
  when the fix is itself safe and mechanical; anything that isn't follows
  the same "flag, don't silently apply" rule as an unsafe red-team fix.
- Never push a commit directly to `main`. All release-branch work lands on
  `main` only via the Phase 5 PR, which the user reviews and merges
  themselves.
- Never create or push a git tag, never run `npm publish`, and never merge
  the Phase 5 PR yourself. Tagging and publishing are the user's action
  once they've reviewed and merged this skill's PR, not something this
  skill does — the tag push is what triggers the npm publish workflow.
- Any server you start (e.g. `npm run dev` for the browser smoke test)
  must be terminated before the skill finishes.

## Rationalizations to resist

- *"This PR's CI is green and the diff is small, I don't need to look at
  the actual diff."* CI passing doesn't rule out unfinished work — a
  small, green diff can still be a stub that leaves a feature half-built.
  Read the diff. This applies to Dependabot PRs too: a bump to a GitHub
  Action or to the build toolchain changes what produces the shipped
  artifact.
- *"The diff since the last tag is small, I'll skip the red-team."* Small
  diffs can still sit on top of latent issues in code nobody's touched
  recently — that's exactly what "whole package, not just the diff" means.
- *"Tests pass, so coverage is fine."* Passing tests and meaningful
  coverage are different questions — the per-file coverage floors here are
  low on purpose. A red build blocks release; a green build with hollow
  tests doesn't guarantee anything.
- *"`npm test` passed, so the bundle is fine."* The default `npm test`
  excludes `bundle.test.ts` and the accessibility suite; the UMD bundle and
  a11y are exactly what `test:bundle` and `test:a11y` cover, and the bundle
  is the thing users actually load.
- *"Docs are close enough, I'll skip the cleanup pass."* Accumulated
  changes since the last tag are exactly when docs drift from behavior —
  this phase exists because per-PR doc updates miss the cross-cutting
  view. Hardcoded version strings in the README are the classic miss.
- *"jsdom tests cover the widget, so I can skip the browser smoke test."*
  jsdom doesn't render shadow DOM styling, layout, or real cookie
  behavior; if you skip the browser check, say so in the report instead of
  implying it passed.
