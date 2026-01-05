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
 * Data attribute for session ID
 */
export const SESSION_ID_ATTRIBUTE = 'data-coolhand-session-id';

/**
 * Data attribute for workload hash ID
 */
export const WORKLOAD_ID_ATTRIBUTE = 'data-coolhand-workload-id';

/**
 * Data attribute for storing the feedback ID after submission
 */
export const FEEDBACK_ID_ATTRIBUTE = 'data-coolhand-feedback-id';

/**
 * Data attribute for storing original output (for textarea/input elements)
 */
export const ORIGINAL_OUTPUT_ATTRIBUTE = 'data-coolhand-original-output';

/**
 * Data attribute for widget style ("overlay", "pixel", or "hidden")
 */
export const WIDGET_STYLE_ATTRIBUTE = 'data-coolhand-widget-style';

/**
 * Debounce delay in milliseconds for input change events
 */
export const DEBOUNCE_MS = 1000;

/**
 * CSS class prefix for all widget styles
 */
export const CSS_PREFIX = 'coolhand';
