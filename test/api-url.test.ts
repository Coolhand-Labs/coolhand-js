import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CoolhandFeedback } from '../src/coolhand-feedback';
import { FeedbackWidget } from '../src/feedback-widget';
import { COOLHAND_API_URL } from '../src/constants';

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn() as jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

const CUSTOM_URL = 'https://staging.example.com/api/v2/llm_request_log_feedbacks';

// Helper to wait for async operations
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function createSelection(
  element: HTMLElement,
  startOffset: number,
  endOffset: number
): Selection | null {
  const textNode = element.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const range = document.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return selection;
}

function simulateMouseUp(element: HTMLElement): void {
  const event = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  element.dispatchEvent(event);
}

/** Click a sentiment option inside a FeedbackWidget attached to element. */
function clickThumbsUp(element: HTMLElement): void {
  const container = element.querySelector('[data-coolhand-widget]');
  const root = container?.shadowRoot || container;
  const trigger = root?.querySelector('.coolhand-trigger') as HTMLElement;
  trigger?.click();
  const thumbsUp = root?.querySelector('[data-feedback="up"]') as HTMLElement;
  thumbsUp?.click();
}

describe('apiUrl option', () => {
  const originalGetBoundingClientRect = Range.prototype.getBoundingClientRect;
  let element: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockFetch.mockClear();
    mockFetch.mockImplementation(() =>
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

    // Mock Range.prototype.getBoundingClientRect (not supported in jsdom)
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 100,
      bottom: 120,
      right: 200,
      width: 100,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));

    element = document.createElement('div');
    element.textContent = 'Test content for api url routing.';
    document.body.appendChild(element);
  });

  afterEach(() => {
    Range.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document
      .querySelectorAll('.coolhand-partial-widget-container')
      .forEach((el) => el.remove());
  });

  describe('FeedbackWidget', () => {
    it('defaults to the production Coolhand endpoint', async () => {
      const widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      clickThumbsUp(element);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(COOLHAND_API_URL, expect.anything());
      widget.destroy();
    });

    it('submits to a custom apiUrl when provided', async () => {
      const widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        apiUrl: CUSTOM_URL,
      });

      clickThumbsUp(element);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(CUSTOM_URL, expect.anything());
      widget.destroy();
    });
  });

  describe('CoolhandFeedback global threading', () => {
    let coolhand: CoolhandFeedback;

    afterEach(() => {
      coolhand?.destroy();
    });

    it('threads a global apiUrl from init() into attached widgets', async () => {
      coolhand = new CoolhandFeedback();
      coolhand.init('test-api-key', { autoAttach: false, apiUrl: CUSTOM_URL });
      coolhand.attach(element);

      clickThumbsUp(element);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(CUSTOM_URL, expect.anything());
    });

    it('lets a per-attach apiUrl override the global one', async () => {
      coolhand = new CoolhandFeedback();
      coolhand.init('test-api-key', {
        autoAttach: false,
        apiUrl: 'https://global.example.com/feedback',
      });
      coolhand.attach(element, { apiUrl: CUSTOM_URL });

      clickThumbsUp(element);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(CUSTOM_URL, expect.anything());
    });

    it('threads a global apiUrl into auto-attached widgets', async () => {
      document.body.innerHTML = '<div coolhand-feedback>Auto attach content</div>';
      const autoElement = document.querySelector('[coolhand-feedback]') as HTMLElement;

      coolhand = new CoolhandFeedback();
      coolhand.init('test-api-key', { apiUrl: CUSTOM_URL });

      clickThumbsUp(autoElement);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(CUSTOM_URL, expect.anything());
    });

    it('threads a global apiUrl into partial feedback submissions', async () => {
      coolhand = new CoolhandFeedback();
      coolhand.init('test-api-key', { autoAttach: false, apiUrl: CUSTOM_URL });
      coolhand.attachPartialFeedback(element);

      createSelection(element, 0, 4); // "Test"
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const root = widget?.shadowRoot || widget;
      const upButton = root?.querySelector('[data-feedback="up"]') as HTMLElement;
      upButton?.click();
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(CUSTOM_URL, expect.anything());
    });

    it('keeps the default endpoint when no apiUrl is configured', async () => {
      coolhand = new CoolhandFeedback();
      coolhand.init('test-api-key', { autoAttach: false });
      coolhand.attach(element);

      clickThumbsUp(element);
      await wait(100);

      expect(mockFetch).toHaveBeenCalledWith(COOLHAND_API_URL, expect.anything());
    });
  });
});
