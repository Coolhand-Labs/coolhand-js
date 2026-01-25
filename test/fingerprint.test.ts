import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FeedbackWidget } from '../src/feedback-widget';
import { CoolhandFeedback } from '../src/coolhand-feedback';

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn() as jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

/**
 * Helper to get shadow root from widget container
 */
function getShadowRoot(element: HTMLElement): ShadowRoot | null {
  const container = element.querySelector('[data-coolhand-widget]');
  return container?.shadowRoot || null;
}

describe('Fingerprint Integration', () => {
  let element: HTMLElement;
  let widget: FeedbackWidget;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          like: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
    });

    element = document.createElement('div');
    element.textContent = 'Test content for feedback';
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
    }
  });

  describe('FeedbackWidget with coolhandFingerprintId', () => {
    it('should include coolhand_fingerprint_id in sendFeedback payload', async () => {
      const testFingerprintId = 'test-fingerprint-uuid-12345';

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        coolhandFingerprintId: testFingerprintId,
      });

      // Trigger feedback
      const shadowRoot = getShadowRoot(element);
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify fetch was called with fingerprint
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe(testFingerprintId);
    });

    it('should include both client_unique_id and coolhand_fingerprint_id', async () => {
      const testFingerprintId = 'fingerprint-uuid';
      const testClientId = 'client-123';

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        clientUniqueId: testClientId,
        coolhandFingerprintId: testFingerprintId,
      });

      // Trigger feedback
      const shadowRoot = getShadowRoot(element);
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify both IDs are in payload
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.llm_request_log_feedback.client_unique_id).toBe(testClientId);
      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe(testFingerprintId);
    });

    it('should not include coolhand_fingerprint_id if not provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        clientUniqueId: 'client-123',
        // No coolhandFingerprintId
      });

      // Trigger feedback
      const shadowRoot = getShadowRoot(element);
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify fingerprint is NOT in payload
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.llm_request_log_feedback.client_unique_id).toBe('client-123');
      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBeUndefined();
    });
  });
});

describe('CoolhandFeedback Fingerprint', () => {
  let coolhand: CoolhandFeedback;

  beforeEach(() => {
    document.body.innerHTML = '';

    // Mock fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as jest.Mock) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            like: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
      })
    );
  });

  afterEach(() => {
    if (coolhand) {
      coolhand.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('init with enableFingerprint', () => {
    it('should disable fingerprinting when enableFingerprint is false', async () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand = new CoolhandFeedback();

      // Suppress HTTPS warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      coolhand.init('test-api-key', { enableFingerprint: false });

      await new Promise((resolve) => setTimeout(resolve, 50));

      consoleSpy.mockRestore();
      logSpy.mockRestore();

      // Trigger feedback
      const container = document.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify fingerprint is NOT in payload (because it was explicitly disabled)
      expect(global.fetch).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchCall = (global.fetch as jest.Mock<any>).mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBeUndefined();
    });
  });

  describe('attach with fingerprint', () => {
    it('should pass fingerprint to manually attached widgets', async () => {
      coolhand = new CoolhandFeedback();

      // Suppress warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      coolhand.init('test-api-key', { autoAttach: false, enableFingerprint: false });

      consoleSpy.mockRestore();
      logSpy.mockRestore();

      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      // Manually attach with fingerprint (simulating what would happen if cookie worked)
      const widget = coolhand.attach(element, {
        coolhandFingerprintId: 'manual-fingerprint-123',
      });

      expect(widget).not.toBeNull();

      // Trigger feedback to verify fingerprint is in payload
      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify fingerprint IS in payload
      expect(global.fetch).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchCall = (global.fetch as jest.Mock<any>).mock.calls[0] as [string, { body: string }];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe('manual-fingerprint-123');
    });
  });
});

describe('Fingerprint in API Payloads', () => {
  let element: HTMLElement;
  let widget: FeedbackWidget;

  beforeEach(() => {
    document.body.innerHTML = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as jest.Mock) = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 123,
            like: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
      })
    );

    element = document.createElement('div');
    element.textContent = 'Test content for feedback';
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
    }
    jest.restoreAllMocks();
  });

  it('should include fingerprint in sendExplanation payload', async () => {
    const testFingerprintId = 'explanation-fingerprint-uuid';

    widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
      coolhandFingerprintId: testFingerprintId,
      explanationSample: 1, // Always ask for explanation
    });

    // Trigger feedback
    const shadowRoot = getShadowRoot(element);
    const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
    trigger?.click();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
    thumbsUp?.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should show explanation UI, type and submit
    const textarea = shadowRoot?.querySelector('.coolhand-explanation-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = 'This is my explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const submitBtn = shadowRoot?.querySelector('.coolhand-submit-btn') as HTMLElement;
    submitBtn?.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // Find the explanation call (it's a PATCH request)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (global.fetch as jest.Mock<any>).mock.calls as Array<[string, { body: string }]>;
    const explanationCall = calls.find((call) => {
      const body = JSON.parse(call[1].body);
      return body.llm_request_log_feedback.explanation !== undefined;
    });

    if (explanationCall) {
      const requestBody = JSON.parse(explanationCall[1].body);
      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe(testFingerprintId);
    }
  });

  it('should include fingerprint in sendRevisedOutput payload for textarea', async () => {
    // Create a textarea element
    const textarea = document.createElement('textarea');
    textarea.value = 'Original AI output';
    textarea.setAttribute('coolhand-feedback', '');
    document.body.appendChild(textarea);

    const testFingerprintId = 'revised-output-fingerprint';

    widget = new FeedbackWidget(textarea, 'Original AI output', 'test-api-key', {
      coolhandFingerprintId: testFingerprintId,
    });

    // Change the textarea value
    textarea.value = 'Modified output by user';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Check if fetch was called with fingerprint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (global.fetch as jest.Mock<any>).mock.calls as Array<[string, { body: string }]>;
    const revisedOutputCall = calls.find((call) => {
      const body = JSON.parse(call[1].body);
      return body.llm_request_log_feedback.revised_output !== undefined;
    });

    if (revisedOutputCall) {
      const requestBody = JSON.parse(revisedOutputCall[1].body);
      expect(requestBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe(testFingerprintId);
    }
  });
});
