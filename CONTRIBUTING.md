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
