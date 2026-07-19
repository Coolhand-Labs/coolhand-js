# TypeScript Usage

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

> **Note:** `src/index.ts` intentionally declares no named *value* exports — only the default export and the type-only exports shown above. The UMD bundle is built with webpack `library.export: 'default'`, so a named value export would type-check but be `undefined` at runtime. Don't re-add named value exports to `src/index.ts`; expose new functionality through the `CoolhandJS` default export instance instead.

## Available Types

| Type | Description |
|------|-------------|
| `FeedbackValue` | `true \| false \| null` - Feedback sentiment |
| `FeedbackType` | `'up' \| 'down' \| 'neutral'` - UI feedback type |
| `InitOptions` | Options for `init()` |
| `AttachOptions` | Options for `attach()` |
| `FeedbackApiPayload` | API request structure |
| `FeedbackApiResponse` | API response structure |
