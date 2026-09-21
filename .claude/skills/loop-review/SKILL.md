---
name: loop-review
description: |
  Iteratively runs code review against the current diff, applies fixes, and
  re-reviews until a round comes back clean (or a safety cap is hit). Use
  when the user types /loop-review, asks to "loop the review", "review
  until clean", "keep reviewing and fixing until nothing's left", or wants
  a self-healing code review cycle instead of a single one-shot pass.
user_invocable: true
version: 0.1.0
---

# Loop Review

This skill runs `/code-review` repeatedly against the working diff, applies
fixes between rounds, and re-reviews until a round finds nothing new or a
safety cap is reached. Use it after a large diff, or whenever a single
review pass isn't enough to converge on a clean state.

## Scope

Review scope is `git diff origin/main` — NOT the triple-dot `origin/main...HEAD`
form. The triple-dot form only sees committed history and silently returns
empty on a branch whose work is still uncommitted, which would make the
reviewer rubber-stamp "LGTM" on real, unreviewed changes. `git diff origin/main`
compares the working tree directly against `origin/main`, so it always covers
whatever mix of commits and uncommitted changes is actually on disk.

`$ARGUMENTS` may contain an effort level to pass through to `/code-review`
(`low`/`medium`/`high`/`max`). Default: `high`.

`$ARGUMENTS` may also contain a round cap override, e.g. `--max-rounds 3`.
Default: 5.

## The round loop

Repeat the following cycle up to the round cap (default 5). Bracket each
round's wall-clock time with `date +%s` before step 1 and after step 3
completes.

1. **Deterministic checks.** Run this repo's verify gate from `AGENTS.md`
   (mirrors what CI runs as separate lint/typecheck and test jobs):

   ```bash
   npm run lint && npm run typecheck && npm test
   ```

   Treat any failing line (lint error, type error, or test failure) as a
   finding with the same weight as a reviewer-reported issue — the review
   step below does not substitute for this.

   If the diff touches anything under `src/` that renders UI (`feedback-widget.ts`,
   `partial-feedback-widget.ts`, `src/styles/`, `src/icons/`), also run
   `npm run test:a11y` — the accessibility suite is not part of the default
   `npm test` gate.

   Also run `git status --short`. Brand-new untracked files (`??`) don't
   show up in `git diff origin/main` at all, which would let a new file
   skip review entirely. If there are any, run `git add -N <path>...`
   (intent-to-add — stages the path as an empty file without staging its
   content, so it appears as a full addition in the diff without actually
   changing what would be committed) before the review step.

2. **Review.** Invoke `/code-review <effort> --fix` (via the `Skill` tool)
   against `git diff origin/main`. Every finding must carry a severity:
   - `[CRITICAL]` — security vulnerabilities, wrong/broken behavior,
     accessibility blockers, performance problems
   - `[NICE-TO-HAVE]` — DRY violations, missing test coverage,
     code-reuse opportunities
   - `[NITPICK]` — documentation, comments, naming, formatting-adjacent
     issues

   If `/code-review`'s own output isn't already severity-tagged, tag each
   finding yourself before logging it. Also record your best estimate of
   tokens used by the review step this round (approximate, not metered).

3. **Disposition.** For every finding this round — deterministic-check
   failures and reviewer findings alike — record exactly one of:
   **fixed** (by `--fix` or your own follow-up Edit/Write/Bash), or
   **rejected: `<one-line reason>`** (false positive / out of scope /
   disagree with the call). None may be silently dropped. Deterministic
   check failures should essentially never be rejected. Log the round
   using the Iteration Log Format below, then append a row to the CSV run
   log.

4. **Dry round (0 findings from both deterministic checks and review) →
   converged.** Stop and move to post-loop verification.

5. **Findings found and fixed** → do not declare victory yet. Go back to
   step 1 for a confirming round — fixes can introduce their own
   regressions, and a clean-looking pass doesn't guarantee convergence.

6. **No-progress detection**: if two consecutive rounds return the same
   non-empty set of findings, `--fix` isn't resolving them mechanically
   (likely a design/architecture call that needs a human). Stop looping,
   list the stuck findings with their rejection reasons, and hand them to
   the user instead of retrying forever.

7. **Safety cap**: if the round cap is reached without converging or
   getting stuck, stop and report the remaining findings — don't loop
   silently past the cap.

Each round's fixes should stay reviewable: don't squash multiple rounds
into one silent edit. Note per-round changes in the final summary so the
user can inspect them with `git diff`.

## Iteration Log Format

Maintain this log as you work:

```
=== Round 1 ===
Deterministic checks: [PASS | FAIL — list of failing checks]
Reviewer found N issues (X critical, Y nice-to-have, Z nitpick):
  1. [CRITICAL] [file:line] description
  2. ...
Fixed: F, Rejected: R
  - Applied: [description of fix]
  - Rejected: [description] — [reason]

=== Round 2 ===
...

=== RESULT ===
[CLEAN after N rounds] or [STOPPED — N issues remain]
```

## Run Log (CSV)

After the loop exits (before Final Summary), append one row per round to
`~/loop-review-outputs/coolhand-js.csv`. Create the directory and file
with this header if they don't already exist:

```
timestamp,branch,round,effort,clock_seconds,tokens_used_approx,critical_found,nice_to_have_found,nitpick_found,total_found,issues_fixed,issues_rejected
```

Use `date -u +%Y-%m-%dT%H:%M:%SZ` for `timestamp` at write time. `branch`
= `git branch --show-current`. `effort` = the effort level used that
round (see Scope). `tokens_used_approx` is your estimate from step 2.
`issues_fixed`/`issues_rejected` are the counts from step 3. Append with
plain `cat >> ~/loop-review-outputs/coolhand-js.csv <<EOF ... EOF` — no
CSV quoting needed.

## Review criteria

Beyond whatever `/code-review` already checks for correctness bugs and
reuse/simplification/efficiency, every round should also flag the items
below. coolhand-js is a browser feedback widget shipped as a UMD bundle
(`CoolhandJS` global, `dist/coolhand.min.js`) that runs inside arbitrary
host pages — not a server-side SDK — so the criteria weight DOM safety,
host-page isolation, and the public bundle surface.

**Correctness & quality**
- Correctness bugs and logic errors
- Missing/broken error handling — in particular `fetch` calls in
  `feedback-widget.ts` and `partial-feedback-widget.ts`: a failed request
  must not throw into the host page or leave the widget stuck in a
  loading/disabled state
- Inefficiencies or unnecessary complexity
- Violations of the project conventions in `AGENTS.md` and the ESLint /
  Prettier config (`npm run lint`, `npm run format:check`)
- TypeScript best practices: `any`/loose typing where a precise interface
  was possible, non-null assertions (`!`) or casts papering over a missing
  check
- DRY: logic duplicated between `feedback-widget.ts` and
  `partial-feedback-widget.ts` (both build request URLs from `apiUrl`,
  render into a shadow root, and post feedback) that should live in a
  shared helper — but don't flag a single one-off snippet as a missing
  abstraction

**Security (browser widget)**
- **XSS / DOM injection.** `innerHTML` is used to render the shadow root,
  options panel, explanation panel, and icons. Any string that originates
  outside this repo's own constants — host-page attribute values
  (`data-coolhand-*`), option values, the element's own text content, API
  responses — must be escaped or set via `textContent` before it is
  interpolated into an HTML string. New `innerHTML`/`insertAdjacentHTML`
  sites need a clear justification.
- **`apiUrl` override.** Feedback payloads, and IDs interpolated into the
  URL path for PATCH/update calls, go to whatever `apiUrl` the host
  configured. Flag anything that weakens this: accepting a non-https URL
  silently, building the path from an unvalidated ID, or sending
  credentials/headers beyond what the feedback API needs.
- **Fingerprint cookie** (`src/cookie.ts`). `Secure`/`SameSite`/`Max-Age`
  attributes are set correctly, the cookie value is parsed defensively
  (`JSON.parse` of a cookie the page or another script could have
  tampered with), and no more identifying data is stored or sent than the
  documented format in `docs/fingerprinting.md`.
- **`localStorage` / persisted state** (`partial-feedback-manager.ts`).
  Stored JSON is treated as untrusted: a corrupt, truncated, or
  wrong-shaped value must not throw or crash the host page.
- **Unsafe parsing of attribute-derived input**: `JSON.parse` of a
  `data-coolhand-*` value without a shape check, regexes built from
  attribute/option values (ReDoS), object merges that could allow
  prototype pollution.
- Secrets, API keys, or credentials hardcoded or logged (`console.*` calls
  that print payloads or identifiers).

**Host-page isolation & accessibility**
- Shadow DOM boundary and CSS isolation (`:host()` vs class selectors, see
  `docs/styling.md`): no styles leaking into or out of the host page, no
  new globals beyond the `CoolhandJS` UMD export.
- MutationObserver / auto-attach (`coolhand-feedback.ts`): no unbounded
  work per mutation, listeners are removed by `detach()`, and the
  documented limitation — it never retries an element that was already
  scanned but gains content later — stays accurate in `docs/attaching.md`
  if the scanning logic changed.
- New or changed interactive UI keeps keyboard access, focus management,
  ARIA labelling, and contrast (WCAG 2.1 AA); `npm run test:a11y` passes.

**npm package / public-API discipline**
- The public surface is the default export of `src/index.ts`, the
  `CoolhandJS` UMD global, the exported types in `src/types.ts`, and the
  `data-coolhand-*` attributes. Don't break them unless necessary.
- If a break is necessary, it must come with documentation updates and a
  clear call-out of the SemVer bump it implies — but per `AGENTS.md`'s
  "Changelog and versioning" rule, don't expect (or ask for)
  `package.json`'s version to be bumped on this branch; that happens once,
  at release time, in `/prep-release`.
- Any change to that surface that was NOT the stated intention of this
  branch is a breaking change requiring explicit justification: removed or
  renamed exports or types, changed defaults, changed option names or
  semantics, changed attribute names, a widened or narrowed declared type.
- Declared exports must match the UMD runtime (a mismatch shipped once and
  was fixed in #37): the bundle exports the default export only
  (`output.library.export: 'default'` in `webpack.config.mjs`).
- `package.json` `files`/`main`/`types` and `webpack.config.mjs` output
  names stay consistent with what `publish.yml` and `release.yml` upload
  and what the README's CDN/release URLs reference.

**Coolhand API accuracy**
- Where the diff touches code that calls the Coolhand feedback API
  (endpoint, request/response shapes, field names), fetch the current
  published API docs from coolhandlabs.com and verify the implementation
  matches, and that `docs/feedback-api.md` still matches the code.
- Flag any mismatches between what the code sends/expects and what the
  API actually accepts/returns.

**Documentation & cross-SDK alignment**
- Check whether `README.md` or files under `docs/` need updates to
  reflect the changes on this branch, and that any documentation touched
  by the diff is still accurate (no stale examples, option names, or
  attribute names).
- Enforce the README/docs split from `AGENTS.md`: the README stays a
  scannable landing page; anything needing more than one code block goes
  in `docs/`; the auto-attach limitation lives in `docs/attaching.md`.
- Flag a `CHANGELOG.md` or `package.json`-version edit on this branch as
  a violation, per `AGENTS.md`'s "Changelog and versioning" rule — those
  are `/prep-release`'s to write, not this branch's. Skip this check on a
  `release/v*` branch — that's exactly where `/prep-release` writes them
  intentionally.
- If this branch adds a README section, changes the Documentation section
  format, or adds a new `docs/` pattern that has an equivalent in
  [coolhand-node](https://github.com/Coolhand-Labs/coolhand-node) or
  [coolhand-ruby](https://github.com/Coolhand-Labs/coolhand-ruby),
  `AGENTS.md` asks that the structure and tone match those SDKs — flag a
  structural divergence, or a structural change with no mention of a
  companion issue/PR there.
- Discoverability (`AGENTS.md`): headings, the package description, and
  feature bullets keep the keyword-rich terms ("AI feedback widget", "LLM
  output feedback", "human feedback collection") rather than abbreviations.

## Post-loop verification

Once the loop converges (or stops early per the rules above), run:

```bash
npm run lint && npm run typecheck && npm test && npm run format:check
```

(plus `npm run test:a11y` if any UI code changed) and include the result
in the final summary. If `format:check` fails only on files this branch
did not touch, report it rather than reformatting unrelated files.

## Final Summary

After the loop exits, output:

1. **Overall result**: CLEAN (N rounds) or STOPPED (issues remain)
2. **Per-round breakdown**: What was found (deterministic + reviewer, with
   severity breakdown) vs. what was fixed/rejected each round
3. **All files modified**: Complete list of files touched across all
   rounds
4. **Remaining issues** (if stopped): Unresolved items with context on
   why they're hard to fix automatically
5. **Run log**: Number of CSV rows appended and the path
   (`~/loop-review-outputs/coolhand-js.csv`)

## Rationalizations to resist

- *"The first round already looked clean, I don't need a confirming
  round."* A fix round can introduce its own regression. Always re-review
  after applying fixes before declaring convergence.
- *"Lint and typecheck passed, so the review is done."* Passing
  deterministic checks is not the same as the review being clean — they
  don't check the criteria above (public-API breakage, changelog
  discipline, XSS, accessibility, API accuracy). Run both.
- *"The strings going into `innerHTML` are all ours."* Trace each
  interpolation back to its source. Option values, `data-coolhand-*`
  attributes, element text, and API responses all originate outside this
  repo.
- *"This finding keeps coming back, I'll just keep re-running --fix and
  it'll eventually take."* If the same non-empty finding set repeats
  across two rounds, `--fix` isn't going to resolve it. Stop and surface
  it — looping past that point just burns rounds for no gain.

## Safety

- Never force-push or amend existing commits as part of this loop.
- The skill only edits the working tree; committing and pushing stays with
  the user.
- If you start `npm run dev` (or any server) to check something in a
  browser, terminate it before finishing the round.
