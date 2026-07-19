# coolhand-js

## Setup

```bash
npm install
```

## Verify before committing

```bash
npm run lint && npm run typecheck && npm test
```

This mirrors what CI runs (`.github/workflows/lint.yml` and `test.yml` run lint+typecheck and tests as separate jobs). A green run of all three means a green CI run. Before a release, also run `npm run test:bundle` and `npm run test:a11y` — `release.yml` builds and tests the actual bundle, and the accessibility suite isn't part of the default `npm test` gate.

## Running individual tools

```bash
npm run dev # Dev server at http://localhost:3333 (open examples/index.html to test)
npm run build # Production build -> dist/coolhand.min.js
npm run build:dev # Development build (unminified)
npm run typecheck # TypeScript type check (tsc --noEmit)
npm run lint # ESLint on src/
npm run lint:fix # ESLint with auto-fix
npm run format # Prettier --write on src/**/*.ts
npm run format:check # Prettier --check
npm test # Full Jest test suite (jsdom)
npm test -- path/to/test # Run a single test file
npm run test:watch # Jest in watch mode
npm run test:coverage # Jest with coverage report
npm run test:a11y # Accessibility-only tests (jest-axe)
npm run test:bundle # Smoke test the built dist/coolhand.min.js bundle
npm run clean # Remove dist/ and coverage/
```

For secure-cookie (fingerprinting) testing locally, see the HTTPS setup steps in `CONTRIBUTING.md`.

## README and docs philosophy

The README is a landing page — install, quick start, what it supports, where to go next. Keep it scannable. When in doubt, link rather than expand.

**Three rules:**

- **Auto-attach**: the one-line "just add the `coolhand-feedback` attribute" pitch and the basic `init()`/`attach()`/`detach()` API reference belong in the README. The MutationObserver mechanics — and critically, **the fact that it never retries an element that was already scanned but gains content later** — belong in `docs/attaching.md`. Do not let this limitation drift back out of the docs: it shipped undocumented once already (see #45) precisely because it lived only in implementation comments, not in either the README or `docs/`.
- **Feedback API**: the basic payload shape belongs in the README only if directly relevant to the surrounding section; the full field table, PATCH/update flow, and endpoint reference go in `docs/feedback-api.md`.
- **Fingerprinting, auto-highlight, widget placement, styling**: a short intro plus one basic code example belongs in the README. Cookie formats, edge-case tables, CSS architecture (`:host()` vs class selectors), and other implementation internals go in their own `docs/*.md` file.

**Anything requiring more than one code block to explain goes in `docs/`, not the README.** If you're adding a new feature section and it's outgrowing a single example, that's the signal to create `docs/<feature>.md` and link it from the README's `## Documentation` section rather than letting the README grow.

**Align with coolhand-node and coolhand-ruby.** Those SDKs follow this same README-vs-docs split. When adding a README section that has an equivalent there (Related Packages, the Documentation section format, Requirements/Browser Support style), match their structure and tone — the SDK family's docs should feel like siblings even though coolhand-js is a frontend widget rather than a server-side monitoring SDK.

## Discoverability (SEO / AEO)

The README is indexed by search engines and consumed by AI agents doing package research. Write headings, the package description, and feature bullets with this in mind: use full, keyword-rich terms — "AI feedback widget", "LLM output feedback", "human feedback collection", "human-in-the-loop feedback UI" — rather than abbreviations, matching the `package.json` keywords (`feedback`, `widget`, `llm`, `ai`, `human feedback`, `accessibility`). The goal is that both humans and AI agents searching for "JavaScript AI feedback widget" or "collect human feedback on LLM output" land here.
