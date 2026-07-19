# CoolhandJS Feedback Widget

A lightweight, standalone JavaScript library for adding user feedback collection to any AI output. The widget integrates seamlessly with a single API endpoint which you can implement yourself or set up a quick, free account on Coolhand to capture & analyze in realtime.

## Features

- 🎯 **Ultra Simple**: Add `coolhand-feedback` attribute to any element - no custom JavaScript required!
- 🛡️ **Isolated Styling**: Uses Shadow DOM (when available) to prevent CSS conflicts
- 🎨 **Clean UI**: Minimal, non-intrusive design with smooth animations
- 📦 **Zero Dependencies**: Pure JavaScript, no external libraries required
- 📱 **Customizable**: Easy to customize with your own styling or icons.
- ⚡ **Lightweight**: ~16KB minified
- 📘 **TypeScript Support**: Full type definitions included
- ♿ **Accessible**: WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
- 🔄 **Smart Updates**: Automatically tracks and updates feedback when users change their response
- ✏️ **Revised Output Tracking**: Automatically captures edits to textarea/input content
- 💬 **Explanation Prompts**: Optionally ask users to explain their feedback with configurable sampling
- 🍪 **User Fingerprinting** *(Experimental)*: Automatic cookie-based session tracking for cross-session feedback correlation
- 📍 **Configurable Placement**: Position widgets at any corner (top-right, top-left, bottom-right, bottom-left)

## Accessibility

The widget is designed with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support including Tab, Enter/Space, Escape, and Arrow keys
- **Screen Reader Support**: ARIA labels, roles, and live regions for real-time announcements
- **Focus Management**: Visible focus indicators on all interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **Semantic HTML**: Proper button elements with `role="radiogroup"` and `role="radio"` for feedback options

## Related Packages

- **Node.js**: [coolhand-node package](https://github.com/Coolhand-Labs/coolhand-node) - Coolhand monitoring for Node.js applications
- **Ruby**: [coolhand gem](https://github.com/Coolhand-Labs/coolhand-ruby) - Coolhand monitoring for Ruby applications
- **Python**: [coolhand package](https://github.com/Coolhand-Labs/coolhand-python) - Coolhand monitoring for Python applications

## Installation

### CDN

Include via jsDelivr - these automatically mirror the npm package:

```html
<!-- jsDelivr (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/coolhand@0.2.0/dist/coolhand.min.js"></script>

<!-- Latest version (auto-updates) -->
<script src="https://cdn.jsdelivr.net/npm/coolhand/dist/coolhand.min.js"></script>
```

Or via GitHub releases:

```html
<script src="https://github.com/Coolhand-Labs/coolhand-js/releases/download/v0.2.0/coolhand.min.js"></script>
```

### npm

```bash
npm install coolhand
```

### Local Build

```bash
# Clone the repository
git clone https://github.com/Coolhand-Labs/coolhand-js.git
cd coolhand-js

# Install dependencies
npm install

# Build the library
npm run build

# Output will be in dist/coolhand.min.js
```

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <script src="coolhand.min.js"></script>
</head>
<body>
    <!-- Just add coolhand-feedback attribute -->
    <div coolhand-feedback>
        This content will automatically get a feedback widget!
        The feedback icon will appear in the upper-right corner.
    </div>

    <script>
        // One line initialization - widgets auto-attach!
        CoolhandJS.init('your-api-key-here');
    </script>
</body>
</html>
```

## API Reference

### `CoolhandJS.init(apiKey, options)`

Initialize the library with your Coolhand API key. Automatically attaches to all elements with `coolhand-feedback` attribute.

**Parameters:**
- `apiKey` (string, required): Your Coolhand API key
- `options` (object, optional): Configuration options
  - `autoAttach` (boolean): Enable auto-attachment (default: true)
  - `clientUniqueId` (string): Optional client identifier sent with all feedback (e.g., user ID, session ID)
  - `apiUrl` (string): Override the API endpoint feedback is submitted to (default: the production Coolhand endpoint). Useful for staging environments, proxies, or self-hosted collectors.
  - `widgetStyle` (string): Default widget style for all widgets - `"overlay"` (default), `"pixel"`, or `"hidden"`
  - `explanationSample` (number): Probability (0-1) of showing explanation prompt after feedback. `0` = never ask, `1` = always ask (default), `0.2` = ask 20% of the time
  - `enableFingerprint` (boolean): *(Experimental)* Enable automatic cookie-based user fingerprinting (default: true). Set to `false` to disable.
  - `autoHighlight` (boolean): *(Experimental)* Enable automatic highlight on first visit (default: true). When enabled, all feedback widgets show a pulsating highlight until the user interacts with any widget. State is persisted in a cookie.
  - `placementVertical` (string): Widget vertical position - `"top"` (default) or `"bottom"`
  - `placementHorizontal` (string): Widget horizontal position - `"right"` (default) or `"left"`

**Returns:**
- `boolean`: True if initialization succeeded, false otherwise

**Example:**
```javascript
// Auto-attach enabled (default)
CoolhandJS.init('ch_api_abc123...');

// With client tracking
CoolhandJS.init('ch_api_abc123...', { clientUniqueId: 'user-123' });

// Send feedback to a staging/proxy endpoint instead of production
CoolhandJS.init('ch_api_abc123...', { apiUrl: 'https://staging.example.com/api/v2/llm_request_log_feedbacks' });

// Use minimal pixel style for all widgets
CoolhandJS.init('ch_api_abc123...', { widgetStyle: 'pixel' });

// Ask for explanation only 30% of the time
CoolhandJS.init('ch_api_abc123...', { explanationSample: 0.3 });

// Never ask for explanation (just collect ratings)
CoolhandJS.init('ch_api_abc123...', { explanationSample: 0 });

// Disable auto-attachment
CoolhandJS.init('ch_api_abc123...', { autoAttach: false });

// Disable fingerprint cookie (experimental feature)
CoolhandJS.init('ch_api_abc123...', { enableFingerprint: false });

// Disable auto-highlight on first visit (experimental feature)
CoolhandJS.init('ch_api_abc123...', { autoHighlight: false });

// Position all widgets at bottom-left
CoolhandJS.init('ch_api_abc123...', { placementVertical: 'bottom', placementHorizontal: 'left' });
```

### `CoolhandJS.attach(element, options)` (Manual Method)

Manually attach a feedback widget to an HTML element. Usually not needed since auto-attachment handles this — except for elements that gain content *after* the initial auto-attach scan (lazy tabs, accordions, click-to-edit fields), which auto-attach never retries. See [Auto-Attach: How It Works and Its Limits](docs/attaching.md).

**Parameters:**
- `element` (HTMLElement, required): The DOM element to attach the widget to
- `options` (object, optional): Configuration options

**Options:**
- `clientUniqueId` (string): Optional client identifier (overrides global setting from init)
- `workloadId` (string): Optional workload hash ID to associate feedback with a specific workload. Improves fuzzy matching accuracy.
- `apiUrl` (string): Override the API endpoint feedback is submitted to (overrides global setting from init)
- `widgetStyle` (string): Widget display style (overrides global setting) - `"overlay"`, `"pixel"`, or `"hidden"`
- `explanationSample` (number): Probability (0-1) of showing explanation prompt (overrides global setting). Default: `1` (always ask)
- `onSuccess` (function): Callback when feedback is successfully submitted
- `onError` (function): Callback when an error occurs
- `onRevisedOutput` (function): Callback when revised output is sent (for textarea/input elements)
- `placementVertical` (string): Widget vertical position - `"top"` (default) or `"bottom"`
- `placementHorizontal` (string): Widget horizontal position - `"right"` (default) or `"left"`

**Returns:**
- `FeedbackWidget`: The widget instance, or null if attachment failed

**Example:**
```javascript
// Manual attachment (usually not needed)
const widget = CoolhandJS.attach(document.getElementById('content'), {
    workloadId: 'abc123def456',
    onSuccess: (feedback, response) => {
        console.log('Feedback submitted:', feedback); // true, false, or null
    },
    onError: (error) => {
        console.error('Error submitting feedback:', error);
    }
});
```

### `CoolhandJS.detach(element)`

Remove a feedback widget from an element.

**Parameters:**
- `element` (HTMLElement): The element with an attached widget

**Example:**
```javascript
CoolhandJS.detach(document.getElementById('content'));
```

### `CoolhandJS.version`

The SDK version string (e.g. `"0.5.0"`).

**Example:**
```javascript
console.log(CoolhandJS.version); // "0.5.0"
```

## HTML Attribute API (Recommended)

CoolhandJS makes it incredibly easy to capture human feedback on AI outputs. Just add the coolhand-feedback attribute on HTML div containing the feedback:

### Basic Usage
```html
<!-- Simple feedback widget (overlay style - default) -->
<div coolhand-feedback>
  Your content here
</div>

<!-- Pixel style - minimal 8px dot that expands on hover -->
<div coolhand-feedback data-coolhand-widget-style="pixel">
  AI response with minimal feedback indicator
</div>

<!-- Hidden style - no UI, but still tracks input changes -->
<textarea coolhand-feedback data-coolhand-widget-style="hidden">
  Content that tracks edits without showing the feedback widget
</textarea>

<!-- With workload association -->
<div coolhand-feedback data-coolhand-workload-id="abc123def456">
  AI response associated with a specific workload
</div>

<!-- Widget positioned at bottom-left -->
<div coolhand-feedback
     data-coolhand-placement-vertical="bottom"
     data-coolhand-placement-horizontal="left">
  AI response with widget in bottom-left corner
</div>
```

### Textarea/Input Support

When attached to a `<textarea>` or `<input>` element, the widget automatically:
1. Captures the initial value as `original_output`
2. Monitors for changes after feedback is submitted
3. Sends `revised_output` via PATCH when the user edits the content (debounced 1 second)

```html
<!-- Editable AI response with revision tracking -->
<textarea coolhand-feedback data-coolhand-workload-id="abc123">
The AI generated this response which the user can edit.
</textarea>
```

### Supported Attributes
- `coolhand-feedback`: Enables automatic widget attachment
- `data-coolhand-widget-style`: Widget display style - `"overlay"` (default), `"pixel"` (minimal 8px dot that expands on hover), or `"hidden"` (no UI, still tracks input changes)
- `data-coolhand-workload-id`: Optional workload hash ID to associate feedback with a specific workload. When provided, improves fuzzy matching accuracy for connecting feedback to the original LLM request.
- `data-coolhand-explanation-sample-rate`: Override explanation sample rate for this element (float `"0"` to `"1"`). `"1"` = always show, `"0"` = never show, `"0.5"` = 50% chance. Takes priority over the global `explanationSample` setting.
- `data-coolhand-feedback-id`: **Set automatically** after successful feedback submission. Contains the feedback ID returned from the API. When present, subsequent feedback changes automatically update the existing feedback instead of creating duplicates.
- `data-coolhand-explanation`: **Set automatically** after user submits an explanation. Contains the explanation text for reference.
- `data-coolhand-highlight`: Enables a pulsating gradient border around the widget trigger to draw user attention. Great for onboarding or encouraging feedback.
- `data-coolhand-placement-vertical`: Widget vertical position - `"top"` (default) or `"bottom"`. Overrides global `placementVertical` setting.
- `data-coolhand-placement-horizontal`: Widget horizontal position - `"right"` (default) or `"left"`. Overrides global `placementHorizontal` setting.

## Feedback Values

The widget sends three types of feedback to the API endpoint:

- 👍 **Thumbs Up**: `like: true`
- 😐 **Neutral**: `like: null`
- 👎 **Thumbs Down**: `like: false`

## Explanation Feature

After a user selects a feedback rating, the widget can prompt them to provide additional context about their feedback. This helps you understand *why* users rated content the way they did.

### How It Works

1. User clicks the feedback trigger and selects a rating (thumbs up/neutral/thumbs down)
2. The rating is immediately submitted to the API
3. The widget transforms into a text input asking "How could this result be better?"
4. User can optionally type an explanation
5. The explanation is auto-saved (debounced) or when the user clicks Submit/closes the widget
6. If the user returns to the widget later, they see a summary view showing their rating and explanation, which they can edit

### Controlling Explanation Prompts

You can control how often the explanation prompt appears using the `explanationSample` option:

```javascript
// Always ask for explanation (default)
CoolhandJS.init('your-api-key', { explanationSample: 1 });

// Never ask for explanation (ratings only)
CoolhandJS.init('your-api-key', { explanationSample: 0 });

// Ask 25% of the time (random sampling)
CoolhandJS.init('your-api-key', { explanationSample: 0.25 });
```

### Per-Element Overrides

You can override the global setting for specific elements using the `data-coolhand-explanation-sample-rate` attribute (float 0-1):

```html
<!-- Always ask for explanation on this element, regardless of global setting -->
<div coolhand-feedback data-coolhand-explanation-sample-rate="1">
  Important AI response where we always want detailed feedback
</div>

<!-- Never ask for explanation on this element -->
<div coolhand-feedback data-coolhand-explanation-sample-rate="0">
  Simple response where a quick rating is sufficient
</div>

<!-- Ask 50% of the time on this element -->
<div coolhand-feedback data-coolhand-explanation-sample-rate="0.5">
  Response with custom sampling rate
</div>
```

The attribute takes priority over the global `explanationSample` setting, allowing fine-grained control over which outputs get detailed feedback.

## User Fingerprinting *(Experimental)*

CoolhandJS can automatically generate and persist a unique user fingerprint ID via a first-party cookie. This enables cross-session feedback correlation without requiring you to implement user tracking yourself.

Fingerprinting is enabled by default. To disable it:

```javascript
CoolhandJS.init('your-api-key', { enableFingerprint: false });
```

For cookie format/attributes, browser compatibility, and privacy considerations, see [User Fingerprinting](docs/fingerprinting.md).

## Requirements

### Text Content
The element must contain text content or a value (for input/textarea). The widget will not attach to elements without readable text and will log an error to the console. For `<textarea>` and `<input>` elements, the widget uses the `value` property instead of `textContent`.

### API Key
A valid Coolhand API key is required. Get one from your [Coolhand Dashboard](https://coolhandlabs.com/dashboard).

### HTML Attribute Usage
Elements with the `coolhand-feedback` attribute will automatically get feedback widgets when `CoolhandJS.init()` is called. The library uses a MutationObserver to detect dynamically added elements.

> **Limitation:** auto-attach only detects elements *added to the DOM* after `init()` — it never re-scans an element that was already present but empty/hidden at scan time, even after that element later gains content. For elements populated after the initial page load (lazy tabs, accordions, click-to-edit fields), call `CoolhandJS.attach(element)` manually once the content is ready. See [Auto-Attach: How It Works and Its Limits](docs/attaching.md) for details.

### Browser Support
- Chrome 60+
- Firefox 63+
- Safari 10.1+
- Edge 79+
- Mobile browsers (iOS Safari 10.3+, Chrome Mobile)

## CORS Configuration

The Coolhand API supports CORS for browser-based requests. If you encounter CORS issues:

1. Ensure your domain is whitelisted in your Coolhand dashboard
2. Check that you're using HTTPS in production
3. Verify your API key has the correct permissions

## Styling & Customization

The widget uses CSS custom properties (variables) for easy customization while maintaining style isolation.

### CSS Variables

Override these variables to match your design:

```css
/* Apply to elements with the widget */
[coolhand-feedback] {
  --coolhand-bg: #ffffff;           /* Background color */
  --coolhand-bg-hover: #f8f9fa;     /* Hover state background */
  --coolhand-border: #e5e7eb;       /* Border color */
  --coolhand-border-radius: 6px;    /* Corner radius */
  --coolhand-text: #374151;         /* Primary text/icon color */
  --coolhand-text-muted: #6b7280;   /* Secondary text/icon color */
  --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);       /* Default shadow */
  --coolhand-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.12); /* Hover shadow */
  --coolhand-accent: #2563eb;       /* Accent color */
  --coolhand-success: #10b981;      /* Success/positive color */
  --coolhand-icon-size: 18px;       /* Icon dimensions */
  --coolhand-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --coolhand-font-size: 12px;       /* Prompt text size */
}
```

For dark mode and brand color examples, and how the widget isolates itself from your page styles, see [Styling & Customization](docs/styling.md).

## Troubleshooting

### Widget doesn't appear
- Check that the element has text content
- Verify the API key is initialized
- Look for console errors
- Ensure the element has `position: relative` or `position: absolute`

### API errors
- Verify your API key is valid
- Check network tab for CORS errors
- Ensure you're using HTTPS in production
- Check your Coolhand dashboard for domain whitelisting

### Style conflicts
- The widget uses Shadow DOM when available
- Try increasing parent element's z-index
- Check for `overflow: hidden` on parent elements

## Documentation

- **[Auto-Attach: How It Works and Its Limits](docs/attaching.md)** - The MutationObserver mechanism, its limitation with lazily-populated elements, and the manual `attach()`/`detach()` workaround.
- **[Feedback API Reference](docs/feedback-api.md)** - Full API payload, field reference, PATCH update flow, and revised output tracking.
- **[User Fingerprinting](docs/fingerprinting.md)** - Cookie format, security attributes, browser compatibility, and privacy considerations.
- **[Smart Auto-Highlight](docs/auto-highlight.md)** - First-visit highlight behavior, highlight sources, and edge cases.
- **[Widget Placement](docs/widget-placement.md)** - Configuration priority, data attributes, and Shadow DOM CSS architecture.
- **[Styling & Customization](docs/styling.md)** - CSS variable reference, dark mode, and brand color examples.
- **[TypeScript Usage](docs/typescript.md)** - Typed imports, available types, and the `index.ts` named-export caveat.

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details.

## Support

- Create a Free Coolhand Account: [coolhandlabs.com](https://coolhandlabs.com)
- Coolhand API Documentation: [coolhandlabs.com/docs](https://coolhandlabs.com/docs)
- Issues: [GitHub Issues](https://github.com/Coolhand-Labs/coolhand-js/issues)
- Email: team@coolhandlabs.com
