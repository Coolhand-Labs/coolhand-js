# Widget Placement

The SDK supports configurable widget positioning within container elements. Widgets can be placed at any of the four corners: top-right (default), top-left, bottom-right, or bottom-left.

## Configuration Priority

Placement is determined in this order (highest priority first):

1. **Element data attributes** - `data-coolhand-placement-vertical` and `data-coolhand-placement-horizontal`
2. **`attach()` options** - `placementVertical` and `placementHorizontal`
3. **`init()` options** - Global defaults for all widgets
4. **SDK defaults** - `top` and `right`

## Data Attributes

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-coolhand-placement-vertical` | `top`, `bottom` | `top` |
| `data-coolhand-placement-horizontal` | `left`, `right` | `right` |

## Implementation Details

The widget uses Shadow DOM for style isolation. Positioning requires applying classes to both the shadow host (container) and the internal wrapper element.

### CSS Architecture

```css
/* Base positioning on shadow host and wrapper */
:host, .coolhand-feedback-wrapper {
  --coolhand-offset: 8px;
  position: absolute;
  top: var(--coolhand-offset);
  right: var(--coolhand-offset);
}

/* Placement modifier classes */
.coolhand-placement-bottom {
  top: auto;
  bottom: var(--coolhand-offset);
}

.coolhand-placement-left {
  right: auto;
  left: var(--coolhand-offset);
}

/* Shadow host selectors (required for Shadow DOM) */
:host(.coolhand-placement-bottom) {
  top: auto;
  bottom: var(--coolhand-offset);
}

:host(.coolhand-placement-left) {
  right: auto;
  left: var(--coolhand-offset);
}
```

### Why Both `:host()` and Class Selectors?

The widget uses Shadow DOM for style encapsulation. The DOM structure is:

```
Target Element (position: relative)
└── Container / Shadow Host (.coolhand-feedback-container)
    └── Shadow DOM
        └── Wrapper (.coolhand-feedback-wrapper)
            └── Widget UI
```

- **`:host()`** selectors style the shadow host from within the Shadow DOM
- **Class selectors** style the wrapper element inside the Shadow DOM
- Both must have placement classes applied for correct positioning

### Adding Classes to Container

In `init()`, placement classes are added to the container element before attaching the Shadow DOM:

```typescript
private init(): void {
  const container = document.createElement('div');
  container.className = 'coolhand-feedback-container';

  // Add placement classes to container for :host selector
  if (this.placementVertical === 'bottom') {
    container.classList.add('coolhand-placement-bottom');
  }
  if (this.placementHorizontal === 'left') {
    container.classList.add('coolhand-placement-left');
  }

  // Attach Shadow DOM
  this.shadowRoot = container.attachShadow({ mode: 'open' });
  this.render(this.shadowRoot);
}
```

### Reading Placement Configuration

```typescript
// In constructor, priority: attribute > options > default
const verticalAttr = targetElement.getAttribute(PLACEMENT_VERTICAL_ATTRIBUTE);
if (verticalAttr === 'top' || verticalAttr === 'bottom') {
  this.placementVertical = verticalAttr;
} else if (options.placementVertical) {
  this.placementVertical = options.placementVertical;
}
// else: default 'top' from property initialization
```

## Options Panel Positioning

The options panel (thumbs up/down, explanation input) also adjusts based on placement:

```css
/* Panel anchored to left when widget is on left */
.coolhand-placement-left .coolhand-options {
  right: auto;
  left: 0;
}

/* Panel anchored to bottom when widget is on bottom */
.coolhand-placement-bottom .coolhand-options {
  top: auto;
  bottom: 0;
}
```

## Usage Examples

```html
<!-- Default: top-right -->
<div coolhand-feedback>Content</div>

<!-- Bottom-right -->
<div coolhand-feedback data-coolhand-placement-vertical="bottom">Content</div>

<!-- Top-left -->
<div coolhand-feedback data-coolhand-placement-horizontal="left">Content</div>

<!-- Bottom-left -->
<div coolhand-feedback
     data-coolhand-placement-vertical="bottom"
     data-coolhand-placement-horizontal="left">Content</div>
```

```javascript
// Global defaults
CoolhandJS.init('api-key', {
  placementVertical: 'bottom',
  placementHorizontal: 'left'
});

// Per-element override (attribute takes priority)
CoolhandJS.attach(element, { placementVertical: 'top' });
```
