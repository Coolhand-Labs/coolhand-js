# Release Notes v0.4.0

## New Features

### Pulsating Gradient Border Highlight

Added a new `data-coolhand-highlight` attribute that enables a visually striking pulsating gradient border around the feedback widget trigger. This helps draw user attention to the feedback option, making it ideal for onboarding flows or when you want to encourage feedback collection.

**Features:**
- Animated rotating gradient border with vibrant colors (blue, purple, pink, orange, green)
- Subtle pulsing effect that draws attention without being distracting
- Works with both `overlay` and `pixel` widget styles
- Respects `prefers-reduced-motion` for accessibility (shows static gradient instead)

**Usage Examples:**

```html
<!-- Enable highlight on any feedback element -->
<div coolhand-feedback data-coolhand-highlight>
  AI response that needs user feedback
</div>

<!-- Works with pixel mode too -->
<div coolhand-feedback data-coolhand-widget-style="pixel" data-coolhand-highlight>
  Minimal feedback indicator with highlight
</div>
```

**Visual Effect:**
- The trigger button displays a rotating rainbow gradient border
- The gradient smoothly animates around the button
- A subtle pulse effect makes the widget gently breathe
- In reduced motion mode, displays a static gradient

**Use Cases:**
- Onboarding new users to the feedback feature
- Highlighting important AI outputs that need review
- Drawing attention to feedback on critical responses
- A/B testing feedback collection rates

## New Attributes

| Attribute | Description |
|-----------|-------------|
| `data-coolhand-highlight` | Enables pulsating gradient border around the widget trigger |

## Files Changed

- `src/constants.ts` - Added `HIGHLIGHT_ATTRIBUTE` constant
- `src/styles/widget.css.ts` - Added gradient animation and highlight styles
- `src/feedback-widget.ts` - Added highlight class detection and application
