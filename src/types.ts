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
 * Widget vertical placement
 * - top: Position widget at the top of the container (default)
 * - bottom: Position widget at the bottom of the container
 */
export type WidgetPlacementVertical = 'top' | 'bottom';

/**
 * Widget horizontal placement
 * - right: Position widget at the right of the container (default)
 * - left: Position widget at the left of the container
 */
export type WidgetPlacementHorizontal = 'left' | 'right';

/**
 * Options for CoolhandFeedback.init()
 */
export interface InitOptions {
  /** Whether to automatically attach to elements with coolhand-feedback attribute. Default: true */
  autoAttach?: boolean;
  /** Global client unique ID applied to all feedback on the page */
  clientUniqueId?: string;
  /** Global creator unique ID applied to all feedback on the page */
  creatorUniqueId?: string;
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
  /**
   * Vertical placement of the widget within its container.
   * Default: 'top'
   */
  placementVertical?: WidgetPlacementVertical;
  /**
   * Horizontal placement of the widget within its container.
   * Default: 'right'
   */
  placementHorizontal?: WidgetPlacementHorizontal;
  /**
   * Options for partial feedback feature on elements with data-coolhand-allow-partial-feedback
   */
  partialFeedbackOptions?: PartialFeedbackOptions;
}

/**
 * Options for CoolhandFeedback.attach() and FeedbackWidget
 */
export interface AttachOptions {
  /** Unique client identifier for tracking (e.g., user ID, session ID) */
  clientUniqueId?: string;
  /** Unique creator identifier for tracking (e.g., creator ID, author ID) */
  creatorUniqueId?: string;
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
  /**
   * Vertical placement of the widget within its container.
   * Default: 'top'
   */
  placementVertical?: WidgetPlacementVertical;
  /**
   * Horizontal placement of the widget within its container.
   * Default: 'right'
   */
  placementHorizontal?: WidgetPlacementHorizontal;
  /**
   * Options for partial feedback feature
   */
  partialFeedbackOptions?: PartialFeedbackOptions;
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
    creator_unique_id?: string;
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
  id: string;
  created_partial_id?: string;
  updated_partial_id?: string;
  llm_request_log_id?: number;
  like: FeedbackValue;
  created_at: string;
  updated_at: string;
  feedback_partials?: any[];
  warnings?: Array<{ message: string; timestamp: string }>;
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

/**
 * Text range for selection position
 */
export interface TextRange {
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * Individual partial feedback entry
 */
export interface PartialFeedbackEntry {
  /** API feedback ID (null until successfully submitted) */
  id: string | null;
  /** Partial feedback ID for targeting updates (optional) */
  partialId?: string | null;
  /** Text range of the selection */
  range: TextRange;
  /** Feedback type (up/neutral/down) */
  feedbackType: FeedbackType;
  /** Optional explanation text */
  explanation?: string;
  /** Timestamp when feedback was created */
  createdAt: string;
}

/**
 * Storage format for partial feedbacks in data attribute
 */
export interface PartialFeedbackStorage {
  version: number;
  entries: PartialFeedbackEntry[];
}

/**
 * Extended API payload with focus_section for partial feedback
 */
export interface PartialFeedbackApiPayload {
  llm_request_log_feedback: {
    like: FeedbackValue;
    original_output: string;
    focus_section?: string;
    focus_range?: { start: number; end: number };
    collector: string;
    client_unique_id?: string;
    creator_unique_id?: string;
    coolhand_fingerprint_id?: string;
    workload_hashid?: string;
    explanation?: string;
    partial_id?: string;
  };
}

/**
 * Options for partial feedback
 */
export interface PartialFeedbackOptions {
  /** Probability (0-1) of showing explanation prompt. Default: 1 */
  explanationSample?: number;
  /** Callback fired on successful partial feedback submission */
  onPartialFeedbackSuccess?: (entry: PartialFeedbackEntry, response: FeedbackApiResponse) => void;
  /** Callback fired on partial feedback submission error */
  onPartialFeedbackError?: (error: Error, entry: PartialFeedbackEntry) => void;
  /** Client unique ID for tracking */
  clientUniqueId?: string;
  /** Creator unique ID for tracking */
  creatorUniqueId?: string;
  /** Coolhand fingerprint ID */
  coolhandFingerprintId?: string;
  /** Workload hash ID */
  workloadId?: string;
  /** Color scheme for the widget */
  colorScheme?: ColorScheme;
}
