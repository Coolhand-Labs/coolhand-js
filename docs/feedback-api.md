# Feedback API Reference

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

By default these resolve against the production base URL in `COOLHAND_API_URL` (`src/constants.ts`). The base endpoint can be overridden with the `apiUrl` option, set globally on `init()` or per-widget on `attach()`/`attachPartialFeedback()` (the per-widget value takes precedence). The override is threaded through to each widget and used in place of `COOLHAND_API_URL` for all POST and PATCH requests, which is useful for staging environments, proxies, or self-hosted collectors.

Note that `apiUrl` must be the full feedback resource path (e.g. `https://staging.example.com/api/v2/llm_request_log_feedbacks`), not just an origin — for updates the widget appends `/{id}` directly to this value to build the PATCH URL.

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
