# Smart Auto-Highlight

The SDK automatically highlights all feedback widgets for first-time visitors to encourage engagement. The highlight disappears once the user interacts with any widget.

## How It Works

1. **First visit (no cookie):** All feedback widgets show a pulsating gradient highlight
2. **User clicks any widget:** Cookie is updated with `feedbackViewed: true`
3. **Auto-highlights removed:** All auto-highlights disappear immediately across all widgets
4. **Explicit highlights preserved:** Widgets with `data-coolhand-highlight` attribute keep their highlight
5. **Subsequent visits:** No auto-highlights (cookie remembers the interaction)

## Highlight Sources

| Type | Source | When Removed |
|------|--------|--------------|
| **Explicit** | `data-coolhand-highlight` attribute | When user completes the feedback flow for that widget |
| **Auto** | Cookie-based (first visit detection) | When user expands ANY feedback widget |

## Implementation Details

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

## Disabling Auto-Highlight

```javascript
CoolhandJS.init('your-api-key', { autoHighlight: false });
```

## Edge Cases

| Case | Behavior |
|------|----------|
| Cookies disabled | No auto-highlight (graceful degradation) |
| Multiple tabs | Cookie sync only on page load (acceptable limitation) |
| Dynamic widgets | Check cookie state before applying auto-highlight |
| Re-initialization | Re-reads cookie state and applies highlights accordingly |
