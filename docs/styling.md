# Styling & Customization

The widget uses CSS custom properties (variables) for easy customization while maintaining style isolation.

## CSS Variables

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

## Dark Mode Example

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

## Brand Color Example

```css
/* Match your brand colors */
[coolhand-feedback] {
  --coolhand-accent: #7c3aed;       /* Purple accent */
  --coolhand-success: #22c55e;      /* Green for positive */
  --coolhand-border-radius: 12px;   /* More rounded corners */
}
```

## Style Isolation

The widget is designed to avoid conflicts with your existing styles:

- **Shadow DOM**: When supported, styles are completely isolated
- **Scoped Classes**: All classes use `coolhand-` prefix
- **High Specificity**: Z-index of 99999 ensures visibility
- **No Global Styles**: Widget styles don't affect your page
