/**
 * SVG icon for the feedback trigger button - thumbs up/down combo
 * Uses Coolhand brand blue color
 */
export const triggerIcon = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="coolhand-icon-trigger" aria-hidden="true" focusable="false">
  <!-- Thumbs up (scaled and positioned top-left) -->
  <g transform="translate(-1, 0) scale(0.6)">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </g>
  <!-- Thumbs down (scaled and positioned bottom-right, diagonal offset) -->
  <g transform="translate(10, 7) scale(0.6)">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10Z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
  </g>
</svg>
`;

/**
 * SVG icon for thumbs up feedback
 */
export const thumbsUpIcon = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="coolhand-icon-up" aria-hidden="true" focusable="false">
  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z"/>
  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
</svg>
`;

/**
 * SVG icon for thumbs down feedback
 */
export const thumbsDownIcon = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="coolhand-icon-down" aria-hidden="true" focusable="false">
  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10Z"/>
  <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
</svg>
`;

/**
 * SVG icon for neutral/meh feedback
 */
export const neutralIcon = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="coolhand-icon-neutral" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="10"/>
  <path d="M8 15h8"/>
  <path d="M9 9h.01"/>
  <path d="M15 9h.01"/>
</svg>
`;

/**
 * SVG icon for the close button
 */
export const closeIcon = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="coolhand-icon-close" aria-hidden="true" focusable="false">
  <path d="M18 6L6 18M6 6l12 12"/>
</svg>
`;

/**
 * SVG icon for the success checkmark
 */
export const checkmarkIcon = `
<svg class="coolhand-checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <path d="M20 6L9 17l-5-5"/>
</svg>
`;

// Legacy exports for backwards compatibility
export const wavingHandIcon = triggerIcon;
export const handIcon = triggerIcon;
