# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.1] - 2026-09-19

Security and robustness fixes to the widget, plus the publish pipeline, CI hardening, and dependency updates. No public API or option changes.

### Security

- Stored explanation text is no longer interpolated into `innerHTML` when the summary or partial-feedback edit panel reopens. Previously a value containing `</textarea><img onerror=...>` in the `data-coolhand-explanation` or `data-coolhand-partial-feedbacks` attribute (host-writable, and persisted from user-typed text) re-parsed as live markup. It is now set through `textarea.value`.
- Feedback IDs are URL-encoded when building PATCH URLs, so an ID from an API response or attribute can no longer add path segments or a query string to a request that carries the `X-API-Key` header.

### Fixed

- Malformed entries in the `data-coolhand-partial-feedbacks` attribute (`null`, missing `range`, unknown `feedbackType`, non-string `explanation`) are now dropped with a warning instead of throwing out of `init()` and silently disabling auto-attach for the page. Migration note: entries that lack a valid `feedbackType` are now ignored rather than restored.
- Reading or writing `document.cookie` in a context that blocks it (for example a sandboxed iframe) no longer throws; the fingerprint is skipped, as documented.
- Calling `init()` again now disconnects the previous auto-attach `MutationObserver` instead of leaving it running, and `init()` returns `false` with a warning when there is no `document` (server-side rendering) instead of throwing.

### Added

- npm Trusted Publishing (OIDC) workflow that publishes with provenance when a `vX.Y.Z` tag is pushed, after verifying the tag matches `package.json`'s version (#53)
- `SECURITY.md` vulnerability reporting policy, `.github/CODEOWNERS`, and weekly Dependabot updates for npm and GitHub Actions (#53)

### Changed

- CI workflows now declare least-privilege `permissions:`, pin every GitHub Action by commit SHA, and run `npm audit --omit=dev --audit-level=high` in the lint job (#53)

### Documentation

- Documented the release process in `CONTRIBUTING.md` and `CLAUDE.md`, and added the `/loop-review` and `/prep-release` maintainer skills (#71)

### Internal

- Updated dev dependencies and GitHub Actions: `actions/checkout` 7.0.1, `actions/setup-node` 7.0.0, `actions/upload-artifact` 7.0.1, `actions/download-artifact` 8.0.1, `softprops/action-gh-release` 3.0.2, `ts-loader` 9.6.2, `jest-environment-jsdom` 30.4.1, plus transitive lockfile bumps (`shell-quote`, `fast-uri`, `@humanfs/node`, `browserslist`, `baseline-browser-mapping`, `js-yaml`, `brace-expansion`) (#52, #54, #55, #56, #57, #58, #60, #61, #66, #67, #68, #69, #70, #72)

## [0.6.0] - 2026-07-20

### Added

- Feedback regions support (#18, #19)
- `apiUrl` config option to override the feedback API endpoint (#36)
- `data-coolhand-manual-attach` attribute to opt out of auto-attach scanning (#43, #49)

### Fixed

- Declared exports now match the UMD runtime (default export only) (#37)

### Changed

- Auto-attach empty-content skips now log at `console.debug` instead of a louder level (#44, #48)

### Documentation

- Documented auto-attach's retry limitation and split docs into `docs/` (#45, #46)
- Documented HTTPS local-dev setup (#16)

## [0.5.0] - 2026-01-25

Initial tracked release in this changelog.
