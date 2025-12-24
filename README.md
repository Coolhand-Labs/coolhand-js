# CoolhandJS Feedback Widget

A lightweight, standalone JavaScript library for adding user feedback collection to any web content. The widget integrates seamlessly with the Coolhand API to capture user sentiment (thumbs up/down/neutral) on any HTML element.

## Features

- 🎯 **Ultra Simple**: Add `coolhand-feedback` attribute to any element - no JavaScript required!
- 🛡️ **Isolated Styling**: Uses Shadow DOM (when available) to prevent CSS conflicts
- 🎨 **Clean UI**: Minimal, non-intrusive design with smooth animations
- 📦 **Zero Dependencies**: Pure JavaScript, no external libraries required
- 🔒 **Secure**: API key authentication with proper CORS handling
- 📱 **Responsive**: Works on desktop and mobile devices
- ⚡ **Lightweight**: ~8KB minified and gzipped

## Installation

### CDN

Include the script directly from a CDN:

```html
<script src="https://cdn.coolhandlabs.com/feedback/1.0.0/coolhand.min.js"></script>
```

### NPM

```bash
npm install @coolhand/feedback-widget
```

### Local Build

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
        The hand icon will appear in the upper-right corner.
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

**Returns:**
- `boolean`: True if initialization succeeded, false otherwise

**Example:**
```javascript
// Auto-attach enabled (default)
CoolhandJS.init('ch_api_abc123...');

// Disable auto-attachment
CoolhandJS.init('ch_api_abc123...', { autoAttach: false });
```

### `CoolhandJS.attach(element, options)` (Manual Method)

Manually attach a feedback widget to an HTML element. Usually not needed since auto-attachment handles this.

**Parameters:**
- `element` (HTMLElement, required): The DOM element to attach the widget to
- `options` (object, optional): Configuration options

**Options:**
- `sessionId` (string): Optional session identifier for tracking feedback
- `onSuccess` (function): Callback when feedback is successfully submitted
- `onError` (function): Callback when an error occurs

**Returns:**
- `FeedbackWidget`: The widget instance, or null if attachment failed

**Example:**
```javascript
// Manual attachment (usually not needed)
const widget = CoolhandJS.attach(document.getElementById('content'), {
    sessionId: 'user-session-123',
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

The easiest way to use CoolhandJS is with HTML attributes:

### Basic Usage
```html
<!-- Simple feedback widget -->
<div coolhand-feedback>
  Your content here
</div>

<!-- With session tracking -->
<p coolhand-feedback data-coolhand-session-id="article-123">
  Article content with tracked feedback
</p>
```

### Supported Attributes
- `coolhand-feedback`: Enables automatic widget attachment
- `data-coolhand-session-id`: Optional session identifier for tracking

## Feedback Values

The widget sends three types of feedback to the Coolhand API:

- 👍 **Thumbs Up**: `like: true`
- 🤷 **Neutral/Shrug**: `like: null`
- 👎 **Thumbs Down**: `like: false`

## Requirements

### Text Content
The element must contain text content. The widget will not attach to elements without readable text and will log an error to the console.

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

## Styling & Conflicts

The widget is designed to avoid conflicts with your existing styles:

- **Shadow DOM**: When supported, styles are completely isolated
- **Scoped Classes**: All classes use `coolhand-` prefix
- **High Specificity**: Z-index of 99999 ensures visibility
- **No Global Styles**: Widget styles don't affect your page

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

# Clean dist folder
npm run clean
```

### Testing

Open `examples/index.html` after running `npm run dev` to test the widget with various content types. The dev server runs on `http://localhost:3333`.

## API Payload

The widget sends the following payload to the Coolhand API:

```json
{
  "llm_request_log_feedback": {
    "like": true,  // true, false, or null
    "original_output": "The text content from the element",
    "collector": "coolhand-js-1.0.0",
    "client_unique_id": "optional-session-id"
  }
}
```

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

- Documentation: [docs.coolhandlabs.com](https://docs.coolhandlabs.com)
- Issues: [GitHub Issues](https://github.com/coolhandlabs/coolhand-js/issues)
- Email: support@coolhandlabs.com