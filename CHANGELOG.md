# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
