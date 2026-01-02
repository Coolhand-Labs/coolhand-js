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

## Accessibility

The widget is designed with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support including Tab, Enter/Space, Escape, and Arrow keys
- **Screen Reader Support**: ARIA labels, roles, and live regions for real-time announcements
- **Focus Management**: Visible focus indicators on all interactive elements
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- **Semantic HTML**: Proper button elements with `role="radiogroup"` and `role="radio"` for feedback options

## Related Packages

| Package | Environment | Purpose |
|---------|-------------|---------|
| `coolhand` | Browser | Feedback widget for collecting user sentiment on AI outputs |
| `coolhand-node` | Node.js | Server-side monitoring and logging of LLM API calls |

This package (`coolhand`) is the **browser SDK** for frontend feedback collection. For server-side LLM monitoring, see [coolhand-node](https://github.com/Coolhand-Labs/coolhand-node).

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

**Returns:**
- `boolean`: True if initialization succeeded, false otherwise

**Example:**
```javascript
// Auto-attach enabled (default)
CoolhandJS.init('ch_api_abc123...');

// With client tracking
CoolhandJS.init('ch_api_abc123...', { clientUniqueId: 'user-123' });

// Disable auto-attachment
CoolhandJS.init('ch_api_abc123...', { autoAttach: false });
```

### `CoolhandJS.attach(element, options)` (Manual Method)

Manually attach a feedback widget to an HTML element. Usually not needed since auto-attachment handles this.

**Parameters:**
- `element` (HTMLElement, required): The DOM element to attach the widget to
- `options` (object, optional): Configuration options

**Options:**
- `clientUniqueId` (string): Optional client identifier (overrides global setting from init)
- `workloadId` (string): Optional workload hash ID to associate feedback with a specific workload. Improves fuzzy matching accuracy.
- `onSuccess` (function): Callback when feedback is successfully submitted
- `onError` (function): Callback when an error occurs
- `onRevisedOutput` (function): Callback when revised output is sent (for textarea/input elements)

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

## HTML Attribute API (Recommended)

CoolhandJS makes it incredibly easy to capture human feedback on AI outputs. Just add the coolhand-feedback attribute on HTML div containing the feedback:

### Basic Usage
```html
<!-- Simple feedback widget -->
<div coolhand-feedback>
  Your content here
</div>

<!-- With workload association -->
<div coolhand-feedback data-coolhand-workload-id="abc123def456">
  AI response associated with a specific workload
</div>

<!-- Hidden widget (still tracks input changes, but no visible UI) -->
<textarea coolhand-feedback data-coolhand-widget-visibility="hide">
  Content that tracks edits without showing the feedback widget
</textarea>
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
- `data-coolhand-workload-id`: Optional workload hash ID to associate feedback with a specific workload. When provided, improves fuzzy matching accuracy for connecting feedback to the original LLM request.
- `data-coolhand-widget-visibility`: Set to `"hide"` to hide the feedback widget UI while still tracking input changes on textarea/input elements. Useful for programmatic feedback collection.
- `data-coolhand-feedback-id`: **Set automatically** after successful feedback submission. Contains the feedback ID returned from the API. When present, subsequent feedback changes automatically update the existing feedback instead of creating duplicates.

## Feedback Values

The widget sends three types of feedback to the API endpoint:

- 👍 **Thumbs Up**: `like: true`
- 😐 **Neutral**: `like: null`
- 👎 **Thumbs Down**: `like: false`

## Requirements

### Text Content
The element must contain text content or a value (for input/textarea). The widget will not attach to elements without readable text and will log an error to the console. For `<textarea>` and `<input>` elements, the widget uses the `value` property instead of `textContent`.

### API Key
A valid Coolhand API key is required. Get one from your [Coolhand Dashboard](https://coolhandlabs.com/dashboard).

### HTML Attribute Usage
Elements with the `coolhand-feedback` attribute will automatically get feedback widgets when `CoolhandJS.init()` is called. The library uses a MutationObserver to detect dynamically added elements.

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

### Dark Mode Example

```css
/* Dark mode customization */
[coolhand-feedback] {
  --coolhand-bg: #1f2937;
  --coolhand-bg-hover: #374151;
  --coolhand-border: #4b5563;
  --coolhand-text: #f9fafb;
  --coolhand-text-muted: #9ca3af;
  --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  --coolhand-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.4);
}
```

### Brand Color Example

```css
/* Match your brand colors */
[coolhand-feedback] {
  --coolhand-accent: #7c3aed;       /* Purple accent */
  --coolhand-success: #22c55e;      /* Green for positive */
  --coolhand-border-radius: 12px;   /* More rounded corners */
}
```

### Style Isolation

The widget is designed to avoid conflicts with your existing styles:

- **Shadow DOM**: When supported, styles are completely isolated
- **Scoped Classes**: All classes use `coolhand-` prefix
- **High Specificity**: Z-index of 99999 ensures visibility
- **No Global Styles**: Widget styles don't affect your page

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

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details.

## Support

- Create a Free Coolhand Account: [coolhandlabs.com](https://coolhandlabs.com)
- Coolhand API Documentation: [coolhandlabs.com/docs](https://coolhandlabs.com/docs)
- Issues: [GitHub Issues](https://github.com/Coolhand-Labs/coolhand-js/issues)
- Email: team@coolhandlabs.com