/**
 * Widget CSS styles as a template literal
 * Uses CSS custom properties for easy customization
 */
export const widgetStyles = `
<style>
  :host, .coolhand-feedback-wrapper {
    /* Customizable CSS variables */
    --coolhand-bg: #ffffff;
    --coolhand-bg-hover: #f8f9fa;
    --coolhand-border: #e5e7eb;
    --coolhand-border-radius: 6px;
    --coolhand-text: #374151;
    --coolhand-text-muted: #6b7280;
    --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    --coolhand-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.12);
    --coolhand-accent: #2563eb;
    --coolhand-success: #10b981;
    --coolhand-icon-size: 18px;
    --coolhand-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --coolhand-font-size: 12px;

    all: initial;
    display: block;
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 99999;
    font-family: var(--coolhand-font-family);
  }

  .coolhand-feedback-wrapper * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Trigger button */
  .coolhand-trigger {
    all: initial;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    border-radius: var(--coolhand-border-radius);
    cursor: pointer;
    box-shadow: var(--coolhand-shadow);
    transition: all 0.2s ease;
    font-family: var(--coolhand-font-family);
  }

  .coolhand-trigger:hover {
    box-shadow: var(--coolhand-shadow-hover);
    transform: translateY(-1px);
    border-color: var(--coolhand-text-muted);
  }

  .coolhand-trigger:focus {
    outline: none;
  }

  .coolhand-trigger:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  /* All SVGs in trigger */
  .coolhand-trigger svg {
    width: var(--coolhand-icon-size);
    height: var(--coolhand-icon-size);
    fill: none;
    stroke: var(--coolhand-text);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Trigger hand icon - Coolhand brand blue */
  .coolhand-trigger .coolhand-icon-trigger {
    stroke: #3B82F6;
  }

  /* Trigger icon container */
  .coolhand-trigger-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Selected icon container */
  .coolhand-selected-icon {
    display: none;
    align-items: center;
    justify-content: center;
  }

  .coolhand-selected-icon svg {
    width: var(--coolhand-icon-size);
    height: var(--coolhand-icon-size);
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* When feedback has been given, show selected icon */
  .coolhand-trigger.has-feedback .coolhand-trigger-icon {
    display: none;
  }

  .coolhand-trigger.has-feedback .coolhand-selected-icon {
    display: flex;
  }

  /* Color the selected icon based on feedback type */
  .coolhand-trigger.has-feedback[data-selected="up"] .coolhand-selected-icon svg {
    stroke: var(--coolhand-success);
  }

  .coolhand-trigger.has-feedback[data-selected="down"] .coolhand-selected-icon svg {
    stroke: #ef4444;
  }

  .coolhand-trigger.has-feedback[data-selected="neutral"] .coolhand-selected-icon svg {
    stroke: #f59e0b;
  }

  /* Options panel */
  .coolhand-options {
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    border-radius: var(--coolhand-border-radius);
    padding: 12px;
    box-shadow: var(--coolhand-shadow-hover);
    flex-direction: column;
    gap: 8px;
  }

  .coolhand-options.expanded {
    display: flex;
  }

  /* Prompt text */
  .coolhand-prompt {
    font-size: var(--coolhand-font-size);
    font-weight: 500;
    color: var(--coolhand-text);
    text-align: center;
    white-space: nowrap;
    font-family: var(--coolhand-font-family);
    margin-bottom: 4px;
  }

  /* Options row with icons and close */
  .coolhand-options-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* Feedback option buttons */
  .coolhand-option {
    all: initial;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--coolhand-border-radius);
    cursor: pointer;
    transition: all 0.15s ease;
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    font-family: var(--coolhand-font-family);
  }

  .coolhand-option svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: var(--coolhand-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.15s ease;
  }

  .coolhand-option:hover {
    background: var(--coolhand-bg-hover);
    border-color: var(--coolhand-text-muted);
  }

  .coolhand-option:hover svg {
    stroke: var(--coolhand-text);
  }

  .coolhand-option:focus {
    outline: none;
  }

  .coolhand-option:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  .coolhand-option.selected {
    background: var(--coolhand-bg-hover);
    border-color: var(--coolhand-accent);
  }

  .coolhand-option.selected svg {
    stroke: var(--coolhand-accent);
  }

  /* Hover colors for specific feedback types */
  .coolhand-option[data-feedback="down"]:hover {
    border-color: #ef4444;
  }
  .coolhand-option[data-feedback="down"]:hover svg {
    stroke: #ef4444;
  }

  .coolhand-option[data-feedback="neutral"]:hover {
    border-color: #f59e0b;
  }
  .coolhand-option[data-feedback="neutral"]:hover svg {
    stroke: #f59e0b;
  }

  .coolhand-option[data-feedback="up"]:hover {
    border-color: var(--coolhand-success);
  }
  .coolhand-option[data-feedback="up"]:hover svg {
    stroke: var(--coolhand-success);
  }

  /* Selected state colors */
  .coolhand-option[data-feedback="down"].selected {
    border-color: #ef4444;
  }
  .coolhand-option[data-feedback="down"].selected svg {
    stroke: #ef4444;
  }

  .coolhand-option[data-feedback="neutral"].selected {
    border-color: #f59e0b;
  }
  .coolhand-option[data-feedback="neutral"].selected svg {
    stroke: #f59e0b;
  }

  .coolhand-option[data-feedback="up"].selected {
    border-color: var(--coolhand-success);
  }
  .coolhand-option[data-feedback="up"].selected svg {
    stroke: var(--coolhand-success);
  }

  /* Close button */
  .coolhand-close {
    all: initial;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-left: 4px;
    cursor: pointer;
    border-radius: var(--coolhand-border-radius);
    transition: background 0.15s ease;
  }

  .coolhand-close:hover {
    background: var(--coolhand-bg-hover);
  }

  .coolhand-close:focus {
    outline: none;
  }

  .coolhand-close:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  .coolhand-close svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--coolhand-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* Success animation */
  @keyframes coolhand-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .coolhand-success {
    animation: coolhand-pulse 0.3s ease;
  }

  /* Checkmark state */
  .coolhand-checkmark {
    display: none;
    width: var(--coolhand-icon-size);
    height: var(--coolhand-icon-size);
    stroke: var(--coolhand-success);
    stroke-width: 2.5;
    fill: none;
  }

  .coolhand-trigger.showing-checkmark .coolhand-checkmark {
    display: block;
  }

  .coolhand-trigger.showing-checkmark .coolhand-trigger-icon,
  .coolhand-trigger.showing-checkmark .coolhand-selected-icon {
    display: none;
  }

  .coolhand-trigger.showing-checkmark {
    background: #ecfdf5;
    border-color: var(--coolhand-success);
  }

  /* Visually hidden class for screen reader announcements */
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

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-trigger,
    .coolhand-option,
    .coolhand-close,
    .coolhand-option svg {
      transition: none;
    }

    .coolhand-success {
      animation: none;
    }

    @keyframes coolhand-pulse {
      0%, 100% { transform: scale(1); }
    }
  }
</style>
`;
