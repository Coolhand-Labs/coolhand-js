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
 * Options for CoolhandFeedback.init()
 */
export interface InitOptions {
  /** Whether to automatically attach to elements with coolhand-feedback attribute. Default: true */
  autoAttach?: boolean;
}

/**
 * Options for CoolhandFeedback.attach() and FeedbackWidget
 */
export interface AttachOptions {
  /** Unique session identifier for tracking */
  sessionId?: string;
  /** Callback fired on successful feedback submission */
  onSuccess?: (feedback: FeedbackValue, response: FeedbackApiResponse) => void;
  /** Callback fired on feedback submission error */
  onError?: (error: Error) => void;
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
