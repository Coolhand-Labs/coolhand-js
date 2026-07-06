import { CoolhandFeedback } from './coolhand-feedback';

// Export types for library consumers.
// Type-only exports are erased at compile time, so they are always safe.
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

// NOTE: This module intentionally has NO named value exports.
//
// The UMD bundle is built with webpack `library.export: 'default'`
// (see webpack.config.mjs), which exposes ONLY the default export as the
// `CoolhandJS` global / module value. Any named value export declared here
// would appear in the generated index.d.ts but be `undefined` at runtime —
// TypeScript consumers importing it would compile fine and break in the
// browser. Keep the runtime surface (default export) and the declared
// surface (this file) in sync.
//
// Advanced consumers can reach everything through the singleton: it is a
// CoolhandFeedback instance, widgets/managers are returned by
// attach()/attachPartialFeedback(), and the SDK version is available as
// `CoolhandJS.version`.

// Create and export singleton instance for UMD usage
const coolhand = new CoolhandFeedback();

export default coolhand;
