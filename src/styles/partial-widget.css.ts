/**
 * Partial feedback widget CSS styles
 */
export const partialWidgetStyles = `
<style>
  :host, .coolhand-partial-widget-container {
    all: initial;
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  .coolhand-partial-widget {
    --coolhand-bg: #ffffff;
    --coolhand-bg-hover: #f8f9fa;
    --coolhand-border: #e5e7eb;
    --coolhand-border-radius: 6px;
    --coolhand-text: #374151;
    --coolhand-text-muted: #6b7280;
    --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    --coolhand-accent: #2563eb;
    --coolhand-success: #10b981;
    --coolhand-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --coolhand-font-size: 12px;

    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    border-radius: var(--coolhand-border-radius);
    box-shadow: var(--coolhand-shadow);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 140px;
    box-sizing: border-box;
  }

  .coolhand-partial-widget * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Dark mode */
  .coolhand-partial-widget.coolhand-dark {
    --coolhand-bg: #1f2937;
    --coolhand-bg-hover: #374151;
    --coolhand-border: #4b5563;
    --coolhand-text: #f3f4f6;
    --coolhand-text-muted: #9ca3af;
    --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  /* Options row */
  .coolhand-partial-options {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  /* Feedback option buttons */
  .coolhand-partial-widget .coolhand-option {
    all: initial;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--coolhand-border-radius);
    cursor: pointer;
    transition: all 0.15s ease;
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    font-family: var(--coolhand-font-family);
  }

  .coolhand-partial-widget .coolhand-option svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--coolhand-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.15s ease;
  }

  .coolhand-partial-widget .coolhand-option:hover {
    background: var(--coolhand-bg-hover);
    border-color: var(--coolhand-text-muted);
  }

  .coolhand-partial-widget .coolhand-option:hover svg {
    stroke: var(--coolhand-text);
  }

  .coolhand-partial-widget .coolhand-option:focus {
    outline: none;
  }

  .coolhand-partial-widget .coolhand-option:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  .coolhand-partial-widget .coolhand-option.selected {
    background: var(--coolhand-bg-hover);
    border-color: var(--coolhand-accent);
  }

  .coolhand-partial-widget .coolhand-option.selected svg {
    stroke: var(--coolhand-accent);
  }

  /* Hover colors for specific feedback types */
  .coolhand-partial-widget .coolhand-option[data-feedback="down"]:hover {
    border-color: #ef4444;
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="down"]:hover svg {
    stroke: #ef4444;
  }

  .coolhand-partial-widget .coolhand-option[data-feedback="neutral"]:hover {
    border-color: #3B82F6;
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="neutral"]:hover svg {
    stroke: #3B82F6;
  }

  .coolhand-partial-widget .coolhand-option[data-feedback="up"]:hover {
    border-color: var(--coolhand-success);
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="up"]:hover svg {
    stroke: var(--coolhand-success);
  }

  /* Selected state colors */
  .coolhand-partial-widget .coolhand-option[data-feedback="down"].selected {
    border-color: #ef4444;
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="down"].selected svg {
    stroke: #ef4444;
  }

  .coolhand-partial-widget .coolhand-option[data-feedback="neutral"].selected {
    border-color: #3B82F6;
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="neutral"].selected svg {
    stroke: #3B82F6;
  }

  .coolhand-partial-widget .coolhand-option[data-feedback="up"].selected {
    border-color: var(--coolhand-success);
  }
  .coolhand-partial-widget .coolhand-option[data-feedback="up"].selected svg {
    stroke: var(--coolhand-success);
  }

  /* Close button */
  .coolhand-partial-close {
    all: initial;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-left: auto;
    cursor: pointer;
    border-radius: var(--coolhand-border-radius);
    transition: background 0.15s ease;
  }

  .coolhand-partial-close:hover {
    background: var(--coolhand-bg-hover);
  }

  .coolhand-partial-close:hover svg {
    stroke: var(--coolhand-text);
  }

  .coolhand-partial-close:focus {
    outline: none;
  }

  .coolhand-partial-close:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  .coolhand-partial-close svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: var(--coolhand-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* Explanation section */
  .coolhand-partial-explanation {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .coolhand-partial-textarea {
    all: initial;
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 50px;
    padding: 8px;
    font-family: var(--coolhand-font-family);
    font-size: var(--coolhand-font-size);
    color: var(--coolhand-text);
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    border-radius: var(--coolhand-border-radius);
    resize: none;
    line-height: 1.4;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .coolhand-partial-textarea::placeholder {
    color: var(--coolhand-text-muted);
  }

  .coolhand-partial-textarea:focus {
    outline: none;
    border-color: var(--coolhand-accent);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .coolhand-dark .coolhand-partial-textarea:focus {
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }

  /* Submit button */
  .coolhand-partial-submit {
    all: initial;
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 6px 12px;
    font-family: var(--coolhand-font-family);
    font-size: var(--coolhand-font-size);
    font-weight: 500;
    color: #ffffff;
    background: var(--coolhand-accent);
    border: none;
    border-radius: var(--coolhand-border-radius);
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease;
  }

  .coolhand-partial-submit:hover {
    background: #1d4ed8;
  }

  .coolhand-partial-submit:focus {
    outline: none;
  }

  .coolhand-partial-submit:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  /* Screen reader only */
  .coolhand-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-partial-widget .coolhand-option,
    .coolhand-partial-close,
    .coolhand-partial-textarea,
    .coolhand-partial-submit {
      transition: none;
    }
  }
</style>
`;
