# Contributing to CoolhandJS

Thank you for your interest in contributing to CoolhandJS!

## Guidelines

- **Open an issue first** for significant changes to discuss your approach
- **Keep PRs focused** - one feature or fix per pull request
- **Write tests** for new functionality and ensure existing tests pass
- **Follow the code style** - run `npm run lint` and `npm run format` before committing
- **Update documentation** if your changes affect the public API

## Local Build

```bash
# Clone the repository
git clone https://github.com/coolhandlabs/coolhand-js.git
cd coolhand-js

# Install dependencies
npm install

# Build the library
npm run build

# Output will be in dist/coolhand.min.js
```

## Development

### Setup

```bash
npm install
```

### Commands

```bash
# Development server (http://localhost:3333)
npm run dev

# Build production version
npm run build

# Build development version
npm run build:dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Clean dist folder
npm run clean
```

### Testing

Open `examples/index.html` after running `npm run dev` to test the widget with various content types. The dev server runs on `http://localhost:3333`.

Unit tests use Jest with jsdom. Run `npm test` to execute the test suite.

#### HTTPS for Local Development (macOS)

If you need to test secure cookies (fingerprinting) locally, you can enable HTTPS:

1. Install mkcert: `brew install mkcert`
2. Run the setup script: `./setup-https.sh`
3. Start the dev server: `npm run dev`
4. Access via: `https://localhost:3333`

The dev server automatically detects the presence of `localhost.pem` and `localhost-key.pem` certificates and enables HTTPS.

## Feature Documentation

Feature internals (API payload/field reference, fingerprinting cookie format, auto-highlight behavior, widget placement CSS architecture, TypeScript usage) live under [`docs/`](docs/) — see the [Documentation section](README.md#documentation) in the README for the full list.

## Releasing

Releases are published to npm automatically by [`.github/workflows/publish.yml`](.github/workflows/publish.yml) when a `vX.Y.Z` tag is pushed, using npm Trusted Publishing (OIDC) with provenance — there is no `NPM_TOKEN` and maintainers should **not** run `npm publish` locally, since that would race or double-publish against CI.

To cut a release:

1. Run the `/prep-release` Claude Code skill (`.claude/skills/prep-release/SKILL.md`). It triages open PRs and merges the ones you choose, then opens a `release/vX.Y.Z` PR containing the changelog entry, the version bump (`package.json`, `package-lock.json`, and the version strings in the README and `docs/`), and a security review, after running the full lint/typecheck/test/build/bundle/a11y gate. Feature and fix PRs never edit `CHANGELOG.md` or `package.json`'s version — this step owns both.
2. Review and merge that release PR into `main`.
3. Tag the merge commit `vX.Y.Z` and push only that tag: `git tag vX.Y.Z && git push origin vX.Y.Z`. (Avoid `git push --tags`, which pushes every local tag and would trigger a publish run for any stray one.) The `publish` job waits on the `npm-publish` environment, so it may need approval in the Actions UI.
4. `publish.yml` builds, tests, and verifies the tag matches `package.json`'s version before publishing — a mismatch fails the workflow instead of publishing. [`release.yml`](.github/workflows/release.yml) runs independently off the same tag to cut the GitHub Release with build artifacts attached.

### One-time setup (already done for this repo)

Publishing depends on registry- and repo-side configuration that isn't part of the workflow file itself:

- An npm Trusted Publisher configured for the `coolhand` package, pointing at this repo and the `publish.yml` workflow.
- A GitHub Environment named `npm-publish` (referenced by the workflow's `publish` job) protecting the publish step.
