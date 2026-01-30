import { CoolhandFeedback } from './coolhand-feedback';

// Export types for library consumers
export type {
  FeedbackValue,
  FeedbackType,
  InitOptions,
  AttachOptions,
  FeedbackApiPayload,
  FeedbackApiResponse,
  TextRange,
  PartialFeedbackEntry,
  PartialFeedbackOptions,
  PartialFeedbackStorage,
  PartialFeedbackApiPayload,
} from './types';

// Export classes for advanced usage
export { CoolhandFeedback } from './coolhand-feedback';
export { FeedbackWidget } from './feedback-widget';
export { PartialFeedbackManager } from './partial-feedback-manager';
export { PartialFeedbackWidget } from './partial-feedback-widget';

// Export constants
export { COOLHAND_API_URL, VERSION } from './constants';
export {
  PARTIAL_FEEDBACK_ATTRIBUTE,
  PARTIAL_FEEDBACKS_ATTRIBUTE,
  PARTIAL_HIGHLIGHT_CLASS,
  MIN_SELECTION_LENGTH,
} from './constants';

// Create and export singleton instance for UMD usage
const coolhand = new CoolhandFeedback();

export default coolhand;
