import { CoolhandFeedback } from './coolhand-feedback';

// Export types for library consumers
export type {
  FeedbackValue,
  FeedbackType,
  InitOptions,
  AttachOptions,
  FeedbackApiPayload,
  FeedbackApiResponse,
} from './types';

// Export classes for advanced usage
export { CoolhandFeedback } from './coolhand-feedback';
export { FeedbackWidget } from './feedback-widget';

// Export constants
export { COOLHAND_API_URL, VERSION } from './constants';

// Create and export singleton instance for UMD usage
const coolhand = new CoolhandFeedback();

export default coolhand;
