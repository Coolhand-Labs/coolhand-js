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

    --coolhand-offset: 8px;

    all: initial;
    display: block;
    position: absolute;
    top: var(--coolhand-offset);
    right: var(--coolhand-offset);
    z-index: 99999;
    font-family: var(--coolhand-font-family);
  }

  /* Placement modifiers - for wrapper inside shadow DOM */
  .coolhand-placement-bottom {
    top: auto;
    bottom: var(--coolhand-offset);
  }

  .coolhand-placement-left {
    right: auto;
    left: var(--coolhand-offset);
  }

  /* Combined placement: bottom-left */
  .coolhand-placement-bottom.coolhand-placement-left {
    top: auto;
    right: auto;
    bottom: var(--coolhand-offset);
    left: var(--coolhand-offset);
  }

  /* Placement modifiers - for shadow host (container element) */
  :host(.coolhand-placement-bottom) {
    top: auto;
    bottom: var(--coolhand-offset);
  }

  :host(.coolhand-placement-left) {
    right: auto;
    left: var(--coolhand-offset);
  }

  :host(.coolhand-placement-bottom.coolhand-placement-left) {
    top: auto;
    right: auto;
    bottom: var(--coolhand-offset);
    left: var(--coolhand-offset);
  }

  /* Dark mode overrides */
  .coolhand-dark, :host(.coolhand-dark) {
    --coolhand-bg: #1f2937;
    --coolhand-bg-hover: #374151;
    --coolhand-border: #4b5563;
    --coolhand-text: #f3f4f6;
    --coolhand-text-muted: #9ca3af;
    --coolhand-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    --coolhand-shadow-hover: 0 6px 16px rgba(0, 0, 0, 0.4);
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
    stroke: #3B82F6;
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

  /* Options panel positioning for left placement */
  .coolhand-placement-left .coolhand-options {
    right: auto;
    left: 0;
  }

  /* Options panel positioning for bottom placement */
  .coolhand-placement-bottom .coolhand-options {
    top: auto;
    bottom: 0;
  }

  /* Options panel positioning for bottom-left placement */
  .coolhand-placement-bottom.coolhand-placement-left .coolhand-options {
    top: auto;
    right: auto;
    bottom: 0;
    left: 0;
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
    border-color: #3B82F6;
  }
  .coolhand-option[data-feedback="neutral"]:hover svg {
    stroke: #3B82F6;
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
    border-color: #3B82F6;
  }
  .coolhand-option[data-feedback="neutral"].selected svg {
    stroke: #3B82F6;
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

  .coolhand-close:hover svg {
    stroke: var(--coolhand-text);
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

  /* Dark mode checkmark state */
  .coolhand-dark .coolhand-trigger.showing-checkmark {
    background: #064e3b;
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

  /* Pixel mode styles */
  .coolhand-pixel-mode .coolhand-trigger {
    width: 8px;
    height: 8px;
    min-width: 8px;
    min-height: 8px;
    padding: 0;
    background: #3B82F6;
    border: none;
    border-radius: 2px;
    box-shadow: none;
  }

  .coolhand-pixel-mode .coolhand-trigger:hover {
    transform: none;
    box-shadow: none;
  }

  /* Hide all icons in pixel mode trigger */
  .coolhand-pixel-mode .coolhand-trigger .coolhand-trigger-icon,
  .coolhand-pixel-mode .coolhand-trigger .coolhand-selected-icon,
  .coolhand-pixel-mode .coolhand-trigger svg {
    display: none;
  }

  /* Color the pixel based on feedback state */
  .coolhand-pixel-mode .coolhand-trigger.has-feedback[data-selected="up"] {
    background: var(--coolhand-success);
  }

  .coolhand-pixel-mode .coolhand-trigger.has-feedback[data-selected="down"] {
    background: #ef4444;
  }

  .coolhand-pixel-mode .coolhand-trigger.has-feedback[data-selected="neutral"] {
    background: #3B82F6; /* Keep blue for neutral */
  }

  /* No visual change for success state in pixel mode - just show the feedback color */
  .coolhand-pixel-mode .coolhand-trigger.showing-checkmark {
    background: inherit;
    border-color: transparent;
  }

  /* Hide checkmark in pixel mode even when showing-checkmark is active */
  .coolhand-pixel-mode .coolhand-trigger.showing-checkmark .coolhand-checkmark {
    display: none;
  }

  /* Pixel mode: show options on hover or focus (keyboard accessible) */
  .coolhand-pixel-mode:hover .coolhand-trigger,
  .coolhand-pixel-mode:focus-within .coolhand-trigger {
    display: none;
  }

  .coolhand-pixel-mode:hover .coolhand-options,
  .coolhand-pixel-mode:focus-within .coolhand-options {
    display: flex;
  }

  /* Focus visible for pixel mode */
  .coolhand-pixel-mode .coolhand-trigger:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  /* Pulsating highlight effect */
  @keyframes coolhand-highlight-pulse {
    0%, 100% {
      box-shadow:
        0 0 6px 2px rgba(59, 130, 246, 0.7),
        0 0 12px 5px rgba(139, 92, 246, 0.5);
    }
    33% {
      box-shadow:
        0 0 6px 2px rgba(139, 92, 246, 0.7),
        0 0 12px 5px rgba(236, 72, 153, 0.5);
    }
    66% {
      box-shadow:
        0 0 6px 2px rgba(236, 72, 153, 0.7),
        0 0 12px 5px rgba(59, 130, 246, 0.5);
    }
  }

  .coolhand-highlight .coolhand-trigger {
    animation: coolhand-highlight-pulse 2s ease-in-out infinite !important;
  }

  /* Highlight on expanded options panel */
  .coolhand-highlight .coolhand-options.expanded {
    animation: coolhand-highlight-pulse 2.5s ease-in-out infinite;
  }

  /* Highlight on pixel mode hover-revealed options */
  .coolhand-highlight.coolhand-pixel-mode:hover .coolhand-options {
    animation: coolhand-highlight-pulse 2.5s ease-in-out infinite;
  }

  /* Reduced motion: disable highlight animations but keep static glow */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-highlight .coolhand-trigger,
    .coolhand-highlight .coolhand-options.expanded,
    .coolhand-highlight.coolhand-pixel-mode:hover .coolhand-options {
      animation: none;
      box-shadow:
        0 0 6px 2px rgba(59, 130, 246, 0.7),
        0 0 12px 5px rgba(139, 92, 246, 0.5);
    }
  }

  /* Explanation mode styles */
  .coolhand-options.explanation-mode {
    width: 300px;
    min-width: 300px;
  }

  .coolhand-explanation-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .coolhand-explanation-header {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .coolhand-explanation-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .coolhand-explanation-icon svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Color the icon based on the feedback type */
  .coolhand-explanation-icon .coolhand-icon-thumbs-up {
    stroke: var(--coolhand-success);
  }

  .coolhand-explanation-icon .coolhand-icon-thumbs-down {
    stroke: #ef4444;
  }

  .coolhand-explanation-icon .coolhand-icon-neutral {
    stroke: #3B82F6;
  }

  .coolhand-explanation-title {
    flex: 1;
    font-size: var(--coolhand-font-size);
    font-weight: 500;
    color: var(--coolhand-text);
    line-height: 1.4;
    font-family: var(--coolhand-font-family);
  }

  .coolhand-explanation-close {
    all: initial;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;
    border-radius: var(--coolhand-border-radius);
    transition: background 0.15s ease;
  }

  .coolhand-explanation-close:hover {
    background: var(--coolhand-bg-hover);
  }

  .coolhand-explanation-close:hover svg {
    stroke: var(--coolhand-text);
  }

  .coolhand-explanation-close:focus {
    outline: none;
  }

  .coolhand-explanation-close:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  .coolhand-explanation-close svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--coolhand-text-muted);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .coolhand-explanation-textarea {
    all: initial;
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 70px;
    padding: 10px;
    font-family: var(--coolhand-font-family);
    font-size: var(--coolhand-font-size);
    color: var(--coolhand-text);
    background: var(--coolhand-bg);
    border: 1px solid var(--coolhand-border);
    border-radius: var(--coolhand-border-radius);
    resize: none;
    line-height: 1.5;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .coolhand-explanation-textarea::placeholder {
    color: var(--coolhand-text-muted);
  }

  .coolhand-explanation-textarea:focus {
    outline: none;
    border-color: var(--coolhand-accent);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  /* Dark mode textarea focus */
  .coolhand-dark .coolhand-explanation-textarea:focus {
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
  }

  /* Reduced motion for explanation textarea */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-explanation-close,
    .coolhand-explanation-textarea {
      transition: none;
    }
  }

  /* Summary mode styles */
  .coolhand-options.summary-mode {
    width: 300px;
    min-width: 300px;
  }

  .coolhand-summary-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .coolhand-summary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .coolhand-summary-icons {
    display: flex;
    gap: 6px;
  }

  .coolhand-summary-label {
    font-size: var(--coolhand-font-size);
    font-weight: 500;
    color: var(--coolhand-text-muted);
    font-family: var(--coolhand-font-family);
  }

  /* Submit button */
  .coolhand-submit-btn {
    all: initial;
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 8px 16px;
    font-family: var(--coolhand-font-family);
    font-size: var(--coolhand-font-size);
    font-weight: 500;
    color: #ffffff;
    background: var(--coolhand-accent);
    border: none;
    border-radius: var(--coolhand-border-radius);
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .coolhand-submit-btn:hover {
    background: #1d4ed8;
  }

  .coolhand-submit-btn:active {
    transform: scale(0.98);
  }

  .coolhand-submit-btn:focus {
    outline: none;
  }

  .coolhand-submit-btn:focus-visible {
    outline: 2px solid var(--coolhand-accent);
    outline-offset: 2px;
  }

  /* Reduced motion for submit button */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-submit-btn {
      transition: none;
    }
  }

  /* Partial feedback highlight styles */
  .coolhand-partial-highlight {
    position: relative;
    cursor: pointer;
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -2px;
    transition: background-color 0.15s ease;
  }

  .coolhand-partial-highlight[data-feedback-type="up"] {
    background-color: rgba(16, 185, 129, 0.2);
  }

  .coolhand-partial-highlight[data-feedback-type="down"] {
    background-color: rgba(239, 68, 68, 0.2);
  }

  .coolhand-partial-highlight[data-feedback-type="neutral"] {
    background-color: rgba(59, 130, 246, 0.2);
  }

  /* Hover states - slightly darker */
  .coolhand-partial-highlight[data-feedback-type="up"]:hover,
  .coolhand-partial-highlight[data-feedback-type="up"]:focus {
    background-color: rgba(16, 185, 129, 0.35);
  }

  .coolhand-partial-highlight[data-feedback-type="down"]:hover,
  .coolhand-partial-highlight[data-feedback-type="down"]:focus {
    background-color: rgba(239, 68, 68, 0.35);
  }

  .coolhand-partial-highlight[data-feedback-type="neutral"]:hover,
  .coolhand-partial-highlight[data-feedback-type="neutral"]:focus {
    background-color: rgba(59, 130, 246, 0.35);
  }

  /* Focus indicator for keyboard navigation */
  .coolhand-partial-highlight:focus {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .coolhand-partial-highlight:focus:not(:focus-visible) {
    outline: none;
  }

  .coolhand-partial-highlight:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  /* Reduced motion for highlights */
  @media (prefers-reduced-motion: reduce) {
    .coolhand-partial-highlight {
      transition: none;
    }
  }
</style>
`;
