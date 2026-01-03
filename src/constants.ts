/**
 * Coolhand API endpoint for feedback submission
 */
export const COOLHAND_API_URL = 'https://coolhandlabs.com/api/v2/llm_request_log_feedbacks';

/**
 * SDK version - injected from package.json at build time by webpack DefinePlugin
 * @see webpack.config.mjs
 */
declare const __COOLHANDJS_VERSION__: string;
export const VERSION = typeof __COOLHANDJS_VERSION__ !== 'undefined' ? __COOLHANDJS_VERSION__ : '0.0.0';

/**
 * Attribute name for auto-attachment
 */
export const FEEDBACK_ATTRIBUTE = 'coolhand-feedback';

/**
 * Data attribute for workload ID (improves fuzzy matching)
 */
export const WORKLOAD_ID_ATTRIBUTE = 'data-coolhand-workload-id';

/**
 * Data attribute for feedback ID (set after successful submission)
 */
export const FEEDBACK_ID_ATTRIBUTE = 'data-coolhand-feedback-id';

/**
 * Data attribute for storing original output (for textarea/input elements)
 */
export const ORIGINAL_OUTPUT_ATTRIBUTE = 'data-coolhand-original-output';

/**
 * Data attribute for widget visibility (set to "hide" to hide the widget)
 */
export const WIDGET_VISIBILITY_ATTRIBUTE = 'data-coolhand-widget-visibility';

/**
 * Data attribute for workload hash ID
 */
export const WORKLOAD_ID_ATTRIBUTE = 'data-coolhand-workload-id';

/**
 * Data attribute for storing the feedback ID after submission
 */
export const FEEDBACK_ID_ATTRIBUTE = 'data-coolhand-feedback-id';

/**
 * CSS class prefix for all widget styles
 */
export const CSS_PREFIX = 'coolhand';

/**
 * Debounce delay in ms for revised output updates
 */
export const DEBOUNCE_MS = 1000;
