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
    "original_output": "The AI-generated content...",
    "explanation": "This was helpful because it clearly explained the concept.",
    "collector": "coolhand-js-0.5.0",
    "client_unique_id": "optional-session-id",
    "coolhand_fingerprint_id": "550e8400-e29b-41d4-a716-446655440000",
    "workload_hashid": "optional-workload-id",
    "revised_output": "optional-edited-content"
  }
}
```

### Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `like` | Yes | `true`, `false`, or `null` for feedback sentiment |
| `original_output` | Yes | The original text content from the element |
| `explanation` | No | User-provided explanation for their feedback |
| `collector` | Yes | SDK identifier with version |
| `client_unique_id` | No | Session identifier for internal matching |
| `coolhand_fingerprint_id` | No | Auto-generated UUID from cookie (v0.5.0+) |
| `workload_hashid` | No | Workload ID to improve fuzzy matching accuracy |
| `revised_output` | No | Edited content (only for textarea/input elements) |

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

## Revised Output Tracking

For `<textarea>` and `<input>` elements, the widget monitors for content changes after feedback is submitted:

1. When the widget attaches, it captures the current `value` as `original_output`
2. After feedback is submitted, the `data-coolhand-feedback-id` is stored on the element
3. The widget listens for `input` events on the element
4. Changes are debounced (1 second) to avoid excessive API calls
5. When debounce completes, a PATCH request is sent with the `revised_output` field

```javascript
// Example flow:
// 1. User submits thumbs up -> POST creates feedback ID 123
// 2. User edits textarea content
// 3. After 1s of no typing -> PATCH to /123 with revised_output
```

## User Fingerprinting (v0.5.0)

The SDK automatically generates and persists a unique fingerprint ID via cookies to enable cross-session feedback correlation.

### How It Works

1. On first `init()`, a UUID v4 is generated and stored in a cookie (`coolhand_fingerprint`)
2. The fingerprint is automatically included in all feedback API requests
3. The cookie is refreshed on each `init()` call to extend its lifetime (Safari ITP workaround)
4. If cookies are blocked or the site uses HTTP, fingerprinting gracefully degrades (no error, just no fingerprint)

### Cookie Format

The cookie stores JSON with both fingerprint and feedback-viewed state:

```json
{
  "fingerprint": "550e8400-e29b-41d4-a716-446655440000",
  "feedbackViewed": false
}
```

Legacy cookies (plain UUID string) are automatically migrated to the new format.

### Cookie Attributes

| Attribute | Value | Reason |
|-----------|-------|--------|
| Name | `coolhand_fingerprint` | Identifies the cookie |
| Max Age | 365 days | Long-term tracking |
| Path | `/` | Available site-wide |
| SameSite | `None` | Supports third-party iframes |
| Secure | `true` | Required for SameSite=None |

### Disabling Fingerprinting

```javascript
CoolhandJS.init('your-api-key', { enableFingerprint: false });
```

## Smart Auto-Highlight (v0.5.0)

The SDK automatically highlights all feedback widgets for first-time visitors to encourage engagement. The highlight disappears once the user interacts with any widget.

### How It Works

1. **First visit (no cookie):** All feedback widgets show a pulsating gradient highlight
2. **User clicks any widget:** Cookie is updated with `feedbackViewed: true`
3. **Auto-highlights removed:** All auto-highlights disappear immediately across all widgets
4. **Explicit highlights preserved:** Widgets with `data-coolhand-highlight` attribute keep their highlight
5. **Subsequent visits:** No auto-highlights (cookie remembers the interaction)

### Highlight Sources

| Type | Source | When Removed |
|------|--------|--------------|
| **Explicit** | `data-coolhand-highlight` attribute | When user completes the feedback flow for that widget |
| **Auto** | Cookie-based (first visit detection) | When user expands ANY feedback widget |

### Implementation Details

The SDK tracks the highlight source for each widget:

```typescript
// In FeedbackWidget
private highlightSource: 'explicit' | 'auto' | null = null;

// Explicit highlight: from HTML attribute
if (this.targetElement.hasAttribute('data-coolhand-highlight')) {
  this.highlightSource = 'explicit';
}
// Auto highlight: from cookie state (first visit)
else if (this.options.autoHighlight) {
  this.highlightSource = 'auto';
}
```

When the first interaction occurs:
1. The widget notifies `CoolhandFeedback` via `onFirstInteraction` callback
2. `CoolhandFeedback` calls `markFeedbackAsViewed()` to update the cookie
3. `CoolhandFeedback` iterates all widgets and calls `removeAutoHighlight()`
4. Only widgets with `highlightSource === 'auto'` have their highlight removed

### Disabling Auto-Highlight

```javascript
CoolhandJS.init('your-api-key', { autoHighlight: false });
```

### Edge Cases

| Case | Behavior |
|------|----------|
| Cookies disabled | No auto-highlight (graceful degradation) |
| Multiple tabs | Cookie sync only on page load (acceptable limitation) |
| Dynamic widgets | Check cookie state before applying auto-highlight |
| Re-initialization | Re-reads cookie state and applies highlights accordingly |
