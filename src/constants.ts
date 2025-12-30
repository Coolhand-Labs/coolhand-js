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
 * CSS class prefix for all widget styles
 */
export const CSS_PREFIX = 'coolhand';
