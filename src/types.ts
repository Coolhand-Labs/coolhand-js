/**
 * Feedback value sent to the API
 * - true: positive (thumbs up)
 * - false: negative (thumbs down)
 * - null: neutral (shrug)
 */
export type FeedbackValue = true | false | null;

/**
 * Feedback type from UI interaction
 */
export type FeedbackType = 'down' | 'neutral' | 'up';

/**
 * Widget display style
 * - overlay: Default style with icon trigger button
 * - pixel: Minimal 8px dot that expands on hover
 * - hidden: Widget hidden but still tracks input changes
 */
export type WidgetStyle = 'overlay' | 'pixel' | 'hidden';

/**
 * Widget color scheme
 * - light: Light theme (default)
 * - dark: Dark theme
 * - system: Follow system preference (prefers-color-scheme)
 */
export type ColorScheme = 'light' | 'dark' | 'system';

/**
 * Options for CoolhandFeedback.init()
 */
export interface InitOptions {
  /** Whether to automatically attach to elements with coolhand-feedback attribute. Default: true */
  autoAttach?: boolean;
  /** Global client unique ID applied to all feedback on the page */
  clientUniqueId?: string;
  /** Default widget style for all widgets. Default: 'overlay' */
  widgetStyle?: WidgetStyle;
  /** Color scheme for all widgets. Default: 'light' */
  colorScheme?: ColorScheme;
  /**
   * Probability (0-1) of showing explanation prompt after feedback.
   * 0 = never ask, 1 = always ask, 0.2 = ask 20% of the time. Default: 1
   */
  explanationSample?: number;
  /**
   * Whether to enable automatic fingerprint tracking via cookie.
   * Default: true. Set to false to disable fingerprinting.
   * Note: Requires HTTPS for cross-site (iframe) support.
   */
  enableFingerprint?: boolean;
  /**
   * Whether to enable automatic highlight on first visit.
   * When enabled, all feedback widgets show a pulsating highlight until
   * the user interacts with any feedback widget for the first time.
   * The highlight state is persisted in a cookie.
   * Default: true. Set to false to disable auto-highlight.
   * Note: Requires cookies to be enabled. Falls back to no auto-highlight if cookies are blocked.
   */
  autoHighlight?: boolean;
}

/**
 * Options for CoolhandFeedback.attach() and FeedbackWidget
 */
export interface AttachOptions {
  /** Unique client identifier for tracking (e.g., user ID, session ID) */
  clientUniqueId?: string;
  /** Workload hash ID for associating feedback with a specific workload */
  workloadId?: string;
  /** Widget display style (overrides global setting) */
  widgetStyle?: WidgetStyle;
  /** Color scheme (overrides global setting) */
  colorScheme?: ColorScheme;
  /**
   * Probability (0-1) of showing explanation prompt after feedback.
   * 0 = never ask, 1 = always ask, 0.2 = ask 20% of the time. Default: 1
   */
  explanationSample?: number;
  /** Callback fired on successful feedback submission */
  onSuccess?: (feedback: FeedbackValue, response: FeedbackApiResponse) => void;
  /** Callback fired on feedback submission error */
  onError?: (error: Error) => void;
  /** Callback fired when revised output is sent (for textarea/input elements) */
  onRevisedOutput?: (revisedOutput: string, response: FeedbackApiResponse) => void;
  /**
   * Auto-generated fingerprint ID from cookie (set internally by CoolhandFeedback)
   * @internal
   */
  coolhandFingerprintId?: string;
  /**
   * Whether auto-highlight is enabled (set internally by CoolhandFeedback)
   * @internal
   */
  autoHighlight?: boolean;
  /**
   * Callback to notify parent when first interaction occurs (set internally by CoolhandFeedback)
   * @internal
   */
  onFirstInteraction?: () => void;
}

/**
 * API request payload structure
 */
export interface FeedbackApiPayload {
  llm_request_log_feedback: {
    like: FeedbackValue;
    original_output: string;
    collector: string;
    client_unique_id?: string;
    coolhand_fingerprint_id?: string;
    workload_hashid?: string;
    revised_output?: string;
    explanation?: string;
  };
}

/**
 * API response structure from feedback submission
 */
export interface FeedbackApiResponse {
  id: number;
  llm_request_log_id?: number;
  like: FeedbackValue;
  created_at: string;
  updated_at: string;
}

/**
 * Internal widget state
 */
export interface WidgetState {
  isExpanded: boolean;
  selectedFeedback: FeedbackValue;
  selectedType: FeedbackType | null;
}

/**
 * Mapping from feedback type to value
 */
export const FEEDBACK_TYPE_TO_VALUE: Record<FeedbackType, FeedbackValue> = {
  down: false,
  neutral: null,
  up: true,
};
