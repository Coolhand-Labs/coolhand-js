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

## TypeScript Usage

The library includes full TypeScript definitions. Import types directly:

```typescript
import CoolhandJS, {
  FeedbackValue,
  FeedbackApiResponse,
  InitOptions,
  AttachOptions
} from '@coolhand/feedback-widget';

// Initialize with typed options
const options: InitOptions = { autoAttach: true };
CoolhandJS.init('your-api-key', options);

// Manual attachment with callbacks
const element = document.getElementById('my-content')!;
const widget = CoolhandJS.attach(element, {
  sessionId: 'user-123',
  onSuccess: (feedback: FeedbackValue, response: FeedbackApiResponse) => {
    console.log(`Received ${feedback === true ? 'positive' : feedback === false ? 'negative' : 'neutral'} feedback`);
    console.log('Response ID:', response.id);
  },
  onError: (error: Error) => {
    console.error('Failed to submit feedback:', error.message);
  }
});
```

### Available Types

| Type | Description |
|------|-------------|
| `FeedbackValue` | `true \| false \| null` - Feedback sentiment |
| `FeedbackType` | `'up' \| 'down' \| 'neutral'` - UI feedback type |
| `InitOptions` | Options for `init()` |
| `AttachOptions` | Options for `attach()` |
| `FeedbackApiPayload` | API request structure |
| `FeedbackApiResponse` | API response structure |

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

## API Payload

The widget sends the following payload to the Coolhand API:

```json
{
  "llm_request_log_feedback": {
    "like": true,
    "original_output": "The text content from the element",
    "collector": "coolhand-js-0.2.0",
    "client_unique_id": "optional-session-id",
    "workload_hashid": "optional-workload-id"
  }
}
```

## Feedback Updates

When a user changes their feedback on an element that already has a `data-coolhand-feedback-id`, the widget automatically uses PATCH to update the existing feedback rather than creating a new one:

```html
<!-- First feedback submission: POST creates new feedback, sets ID -->
<div coolhand-feedback>AI content</div>
<!-- After first submission: -->
<div coolhand-feedback data-coolhand-feedback-id="12345">AI content</div>

<!-- Second feedback submission: PATCH updates existing feedback -->
<!-- User changes from thumbs up to thumbs down - updates ID 12345 -->
```

This allows users to change their mind without creating duplicate feedback entries.

### API Endpoints

| Action | Method | URL |
|--------|--------|-----|
| Create | POST | `/api/v2/llm_request_log_feedbacks` |
| Update | PATCH | `/api/v2/llm_request_log_feedbacks/{id}` |