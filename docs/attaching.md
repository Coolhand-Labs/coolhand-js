# Auto-Attach: How It Works and Its Limits

`CoolhandJS.init()` attaches feedback widgets to every element with a `coolhand-feedback` attribute in two phases:

1. **Initial scan** — on `init()`, `document.querySelectorAll('[coolhand-feedback]')` runs once and attaches to every matching element found at that moment.
2. **MutationObserver** — a `MutationObserver` is then set up on `document.body` watching `childList`/`subtree`. Whenever new nodes are added to the DOM, it checks each added node (and its descendants) for the `coolhand-feedback` attribute and attaches to any matches.

Both phases funnel through the same per-element attach logic, which requires the element to have extractable text (`textContent`, or `value` for `<textarea>`/`<input>`) — an element with no readable content is skipped silently, logged only at `console.debug` level (hidden by default in most browser devtools). This is different from a manual `CoolhandJS.attach(element)` call, which logs a `console.error` if the element has no readable content, since that's a caller mistake rather than an expected outcome of a best-effort background scan.

## Limitation: elements are never re-checked after their first scan

The `MutationObserver` only reacts to **nodes being added to the DOM**. It does not observe `attributes` or `characterData` changes, so it never re-checks an element that was already present in the DOM when auto-attach ran.

In practice, this means: if an element with `coolhand-feedback` exists at scan time but is empty or hidden — a not-yet-populated tab panel, a collapsed accordion body, a click-to-edit field waiting for its initial value — it gets scanned once, found to have no usable text, and is **never revisited**, even after it later gains real content. Only an explicit `CoolhandJS.attach(element)` call attaches it at that point.

This is easy to miss, because the MutationObserver-based auto-attach reads on first glance as "the SDK watches the DOM and picks things up" — but it only watches for *new elements appearing*, not *existing elements changing*.

## Workaround: attach manually once content is ready

For any element populated after the initial page load (lazy tabs, accordions, async-loaded content, editable fields), call `CoolhandJS.attach(element)` yourself once the content is in place — e.g. from the tab's "shown" event, after the accordion expands, or once your data finishes loading:

```javascript
// Tab panel populated lazily when the tab is activated
tabButton.addEventListener('shown', () => {
  CoolhandJS.attach(document.getElementById('tab-panel-content'));
});
```

If the element is later removed or emptied, call `CoolhandJS.detach(element)` to clean up the widget:

```javascript
CoolhandJS.detach(document.getElementById('tab-panel-content'));
```

See the [`CoolhandJS.attach(element, options)`](../README.md#coolhandjsattachelement-options-manual-method) and [`CoolhandJS.detach(element)`](../README.md#coolhandjsdetachelement) reference in the README for the full options list.

## Note: attach() is a one-time operation per element

Both the initial scan and the MutationObserver skip any element already tracked as attached, and `attach()` itself returns the existing widget (with a console warning) if called twice on the same element. So calling `attach()` again after the element already has a widget is safe but a no-op — it won't create a duplicate or refresh anything. If you need to change what feedback is collected for an element after new content replaces the old, `detach()` it first, then `attach()` again.
