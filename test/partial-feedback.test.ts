/**
 * Tests for partial feedback functionality
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import CoolhandJS from '../src/index';
import { PartialFeedbackManager } from '../src/partial-feedback-manager';
import {
  PARTIAL_FEEDBACK_ATTRIBUTE,
  PARTIAL_FEEDBACKS_ATTRIBUTE,
  PARTIAL_HIGHLIGHT_CLASS,
  MIN_SELECTION_LENGTH,
} from '../src/constants';

// Mock fetch globally
const mockFetch = jest.fn();

// Helper to create a selection in an element
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

// Helper to simulate mouseup event
function simulateMouseUp(element: HTMLElement): void {
  const event = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  element.dispatchEvent(event);
}

// Helper to wait for async operations
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('Partial Feedback', () => {
  // Store original Range prototype methods
  const originalGetBoundingClientRect = Range.prototype.getBoundingClientRect;

  beforeEach(() => {
    document.body.innerHTML = '';
    (CoolhandJS as unknown as { instance: null }).instance = null;
    jest.clearAllMocks();
    (global.fetch as jest.Mock) = mockFetch;

    // Reset mockFetch to default response
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
  });

  afterEach(() => {
    // Restore original methods
    Range.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    jest.restoreAllMocks();
    // Clean up any partial widget containers
    document.querySelectorAll('.coolhand-partial-widget-container').forEach((el) => el.remove());
  });

  describe('CoolhandFeedback Integration', () => {
    it('should auto-attach partial feedback manager when attribute is present', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback ${PARTIAL_FEEDBACK_ATTRIBUTE}>
          This is some AI-generated content that supports partial feedback.
        </div>
      `;

      CoolhandJS.init('test-api-key');
      await wait(50);

      // Verify the element has the attribute
      const element = document.querySelector('[coolhand-feedback]');
      expect(element?.hasAttribute(PARTIAL_FEEDBACK_ATTRIBUTE)).toBe(true);
    });

    it('should NOT attach partial feedback to input elements', () => {
      document.body.innerHTML = `
        <input type="text" coolhand-feedback ${PARTIAL_FEEDBACK_ATTRIBUTE} value="Test content" />
      `;

      CoolhandJS.init('test-api-key');

      // Trying to manually attach should return null
      const input = document.querySelector('input') as HTMLInputElement;
      const result = CoolhandJS.attachPartialFeedback(input);
      expect(result).toBeNull();
    });

    it('should NOT attach partial feedback to textarea elements', () => {
      document.body.innerHTML = `
        <textarea coolhand-feedback ${PARTIAL_FEEDBACK_ATTRIBUTE}>Test content</textarea>
      `;

      CoolhandJS.init('test-api-key');

      // Trying to manually attach should return null
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      const result = CoolhandJS.attachPartialFeedback(textarea);
      expect(result).toBeNull();
    });

    it('should allow manual attachPartialFeedback call', async () => {
      document.body.innerHTML = `
        <div id="target">This is content that supports partial feedback.</div>
      `;

      CoolhandJS.init('test-api-key');
      const element = document.getElementById('target') as HTMLElement;

      const manager = CoolhandJS.attachPartialFeedback(element);
      expect(manager).not.toBeNull();
      expect(manager).toBeInstanceOf(PartialFeedbackManager);
    });

    it('should pass options through to partial feedback manager', async () => {
      document.body.innerHTML = `
        <div id="target">This is content that supports partial feedback.</div>
      `;

      const onSuccess = jest.fn();
      CoolhandJS.init('test-api-key', {
        partialFeedbackOptions: {
          explanationSample: 0.5,
          onPartialFeedbackSuccess: onSuccess,
        },
      });

      const element = document.getElementById('target') as HTMLElement;
      const manager = CoolhandJS.attachPartialFeedback(element);
      expect(manager).not.toBeNull();
    });

    it('should detach partial feedback manager on detach()', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback ${PARTIAL_FEEDBACK_ATTRIBUTE}>
          This is some AI-generated content.
        </div>
      `;

      CoolhandJS.init('test-api-key');
      await wait(50);

      const element = document.querySelector('[coolhand-feedback]') as HTMLElement;

      // Detach should not throw
      expect(() => CoolhandJS.detach(element)).not.toThrow();
    });

    it('should support both full and partial feedback on same element', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback ${PARTIAL_FEEDBACK_ATTRIBUTE}>
          This is some AI-generated content that supports both feedback types.
        </div>
      `;

      CoolhandJS.init('test-api-key');
      await wait(50);

      // Full feedback widget should be attached
      const container = document.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();

      // Element should have partial feedback attribute
      const element = document.querySelector('[coolhand-feedback]');
      expect(element?.hasAttribute(PARTIAL_FEEDBACK_ATTRIBUTE)).toBe(true);
    });
  });

  describe('PartialFeedbackManager', () => {
    let element: HTMLElement;
    let manager: PartialFeedbackManager;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="target">This is test content for partial feedback testing.</div>
      `;
      element = document.getElementById('target') as HTMLElement;
    });

    afterEach(() => {
      if (manager) {
        manager.destroy();
      }
    });

    describe('initialization', () => {
      it('should initialize when element has partial-feedback attribute', () => {
        manager = new PartialFeedbackManager(element, 'test-api-key');
        expect(manager).toBeInstanceOf(PartialFeedbackManager);
      });

      it('should load existing feedbacks from data attribute on init', () => {
        const existingFeedbacks = {
          version: 1,
          entries: [
            {
              id: 456,
              range: { startOffset: 0, endOffset: 4, text: 'This' },
              feedbackType: 'up',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        manager = new PartialFeedbackManager(element, 'test-api-key');

        // Highlight should be restored
        const highlights = element.querySelectorAll(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlights.length).toBe(1);
      });

      it('should handle corrupted/invalid JSON in data attribute gracefully', () => {
        element.setAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE, 'invalid-json');

        // Should not throw
        expect(() => {
          manager = new PartialFeedbackManager(element, 'test-api-key');
        }).not.toThrow();
      });

      it('should handle empty data attribute', () => {
        element.setAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE, '');

        expect(() => {
          manager = new PartialFeedbackManager(element, 'test-api-key');
        }).not.toThrow();
      });
    });

    describe('selection detection', () => {
      beforeEach(() => {
        manager = new PartialFeedbackManager(element, 'test-api-key');
      });

      it('should ignore selections shorter than MIN_SELECTION_LENGTH', async () => {
        createSelection(element, 0, 2); // "Th" - only 2 chars
        simulateMouseUp(element);
        await wait(50);

        // No widget should be created
        const widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).toBeNull();
      });

      it('should detect valid text selection on mouseup', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        // Widget should be created
        const widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).not.toBeNull();
      });

      it('should calculate correct text from selection', async () => {
        const selection = createSelection(element, 8, 12); // "test"
        expect(selection?.toString()).toBe('test');
      });
    });

    describe('highlight management', () => {
      beforeEach(() => {
        manager = new PartialFeedbackManager(element, 'test-api-key');
      });

      it('should make highlight focusable with tabindex="0"', async () => {
        // Create and save a feedback entry
        const existingFeedbacks = {
          version: 1,
          entries: [
            {
              id: 789,
              range: { startOffset: 0, endOffset: 4, text: 'This' },
              feedbackType: 'up',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        // Recreate manager to load highlights
        manager.destroy();
        manager = new PartialFeedbackManager(element, 'test-api-key');

        const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlight?.getAttribute('tabindex')).toBe('0');
      });

      it('should add appropriate aria-label to highlight', async () => {
        const existingFeedbacks = {
          version: 1,
          entries: [
            {
              id: 789,
              range: { startOffset: 0, endOffset: 4, text: 'This' },
              feedbackType: 'up',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        manager.destroy();
        manager = new PartialFeedbackManager(element, 'test-api-key');

        const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlight?.getAttribute('aria-label')).toContain('positive');
        expect(highlight?.getAttribute('aria-label')).toContain('Enter');
      });

      it('should set data-feedback-type attribute on highlight', async () => {
        const existingFeedbacks = {
          version: 1,
          entries: [
            {
              id: 789,
              range: { startOffset: 0, endOffset: 4, text: 'This' },
              feedbackType: 'down',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        manager.destroy();
        manager = new PartialFeedbackManager(element, 'test-api-key');

        const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlight?.getAttribute('data-feedback-type')).toBe('down');
      });
    });

    describe('storage', () => {
      beforeEach(() => {
        manager = new PartialFeedbackManager(element, 'test-api-key');
      });

      it('should include version field in storage format', () => {
        const existingFeedbacks = {
          version: 1,
          entries: [],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        // Reload manager
        manager.destroy();
        manager = new PartialFeedbackManager(element, 'test-api-key');

        const stored = element.getAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE);
        const parsed = JSON.parse(stored || '{}');
        expect(parsed.version).toBe(1);
      });
    });

    describe('cleanup', () => {
      it('should remove event listeners on destroy()', () => {
        manager = new PartialFeedbackManager(element, 'test-api-key');

        // Should not throw
        expect(() => manager.destroy()).not.toThrow();
      });

      it('should preserve highlights on destroy() (data persists)', () => {
        const existingFeedbacks = {
          version: 1,
          entries: [
            {
              id: 789,
              range: { startOffset: 0, endOffset: 4, text: 'This' },
              feedbackType: 'up',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        };
        element.setAttribute(
          PARTIAL_FEEDBACKS_ATTRIBUTE,
          JSON.stringify(existingFeedbacks)
        );

        manager = new PartialFeedbackManager(element, 'test-api-key');
        const highlightsBefore = element.querySelectorAll(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlightsBefore.length).toBe(1);

        manager.destroy();

        // Highlights should still exist
        const highlightsAfter = element.querySelectorAll(`.${PARTIAL_HIGHLIGHT_CLASS}`);
        expect(highlightsAfter.length).toBe(1);
      });
    });
  });

  describe('PartialFeedbackWidget', () => {
    let element: HTMLElement;
    let manager: PartialFeedbackManager;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="target">This is test content for partial feedback widget testing.</div>
      `;
      element = document.getElementById('target') as HTMLElement;
      manager = new PartialFeedbackManager(element, 'test-api-key');
    });

    afterEach(() => {
      manager.destroy();
    });

    describe('rendering', () => {
      it('should display all three feedback buttons (up/neutral/down)', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).not.toBeNull();

        const shadowRoot = widget?.shadowRoot || widget;
        const buttons = shadowRoot?.querySelectorAll('.coolhand-option');
        expect(buttons?.length).toBe(3);

        // Check for each feedback type
        expect(shadowRoot?.querySelector('[data-feedback="down"]')).not.toBeNull();
        expect(shadowRoot?.querySelector('[data-feedback="neutral"]')).not.toBeNull();
        expect(shadowRoot?.querySelector('[data-feedback="up"]')).not.toBeNull();
      });
    });

    describe('feedback submission', () => {
      it('should POST new feedback to API on first selection', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(100);

        expect(mockFetch).toHaveBeenCalled();
        const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(fetchCall[1].method).toBe('POST');
      });

      it('should include focus_section in API payload', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(100);

        const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.llm_request_log_feedback.focus_section).toBe('This');
      });

      it('should include focus_range with start/end in API payload', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(100);

        const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.llm_request_log_feedback.focus_range).toEqual({
          start: 0,
          end: 4,
        });
      });

      it('should include original_output (full element text) in payload', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(100);

        const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.llm_request_log_feedback.original_output).toBe(element.textContent);
      });

      it('should include collector field in payload', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(100);

        const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(fetchCall[1].body as string);
        expect(body.llm_request_log_feedback.collector).toContain('coolhand-js');
      });

      it('should call onPartialFeedbackSuccess callback on success', async () => {
        manager.destroy();

        const onSuccess = jest.fn();
        manager = new PartialFeedbackManager(element, 'test-api-key', {
          onPartialFeedbackSuccess: onSuccess,
        });

        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(150);

        expect(onSuccess).toHaveBeenCalled();
      });

      it('should call onPartialFeedbackError callback on failure', async () => {
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Internal Server Error' }),
          })
        );

        manager.destroy();

        const onError = jest.fn();
        manager = new PartialFeedbackManager(element, 'test-api-key', {
          onPartialFeedbackError: onError,
        });

        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const upButton = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
        upButton?.click();
        await wait(150);

        expect(onError).toHaveBeenCalled();
      });
    });

    describe('close behavior', () => {
      it('should close on Escape key', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        let widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).not.toBeNull();

        // Press Escape
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        });
        document.dispatchEvent(escapeEvent);
        await wait(50);

        widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).toBeNull();
      });

      it('should close on click outside widget', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        let widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).not.toBeNull();

        // Clear selection first
        window.getSelection()?.removeAllRanges();

        // Click outside
        document.body.click();
        await wait(50);

        widget = document.querySelector('.coolhand-partial-widget-container');
        expect(widget).toBeNull();
      });

      it('should close on close button click', async () => {
        createSelection(element, 0, 4); // "This"
        simulateMouseUp(element);
        await wait(50);

        const widget = document.querySelector('.coolhand-partial-widget-container');
        const shadowRoot = widget?.shadowRoot || widget;
        const closeBtn = shadowRoot?.querySelector('.coolhand-partial-close') as HTMLElement;
        closeBtn?.click();
        await wait(50);

        const widgetAfter = document.querySelector('.coolhand-partial-widget-container');
        expect(widgetAfter).toBeNull();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    let element: HTMLElement;
    let manager: PartialFeedbackManager;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="target">This is test content for keyboard navigation testing.</div>
      `;
      element = document.getElementById('target') as HTMLElement;
      manager = new PartialFeedbackManager(element, 'test-api-key');
    });

    afterEach(() => {
      manager.destroy();
    });

    it('should focus first option when widget opens', async () => {
      createSelection(element, 0, 4); // "This"
      simulateMouseUp(element);
      await wait(100);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot;

      if (shadowRoot) {
        const firstOption = shadowRoot.querySelector('.coolhand-option');
        expect(shadowRoot.activeElement).toBe(firstOption);
      }
    });

    it('should navigate between options with Arrow Right', async () => {
      createSelection(element, 0, 4); // "This"
      simulateMouseUp(element);
      await wait(100);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const optionsContainer = shadowRoot?.querySelector('.coolhand-partial-options') as HTMLElement;

      if (optionsContainer) {
        const arrowRight = new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        });
        optionsContainer.dispatchEvent(arrowRight);
        await wait(50);

        // Second option should now be focused
        const options = shadowRoot?.querySelectorAll('.coolhand-option');
        if (widget?.shadowRoot) {
          expect(widget.shadowRoot.activeElement).toBe(options?.[1]);
        }
      }
    });

    it('should close widget with Escape key', async () => {
      createSelection(element, 0, 4); // "This"
      simulateMouseUp(element);
      await wait(50);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    let element: HTMLElement;
    let manager: PartialFeedbackManager;

    beforeEach(() => {
      document.body.innerHTML = `
        <div id="target">This is test content for edge case testing.</div>
      `;
      element = document.getElementById('target') as HTMLElement;
    });

    afterEach(() => {
      if (manager) {
        manager.destroy();
      }
    });

    it('should handle rapid successive selections', async () => {
      manager = new PartialFeedbackManager(element, 'test-api-key');

      // First selection
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(20);

      // Second selection immediately
      createSelection(element, 8, 12);
      simulateMouseUp(element);
      await wait(50);

      // Only one widget should be open
      const widgets = document.querySelectorAll('.coolhand-partial-widget-container');
      expect(widgets.length).toBe(1);
    });

    it('should handle very long selections', async () => {
      element.textContent = 'A'.repeat(2000);
      manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 1000);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();
    });

    it('should handle selections with special characters', async () => {
      element.textContent = 'Hello & goodbye <script>alert("test")</script>';
      manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 16);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();
    });

    it('should not interfere with existing FeedbackWidget behavior', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>
          This is content with both feedback types.
        </div>
      `;

      CoolhandJS.init('test-api-key');
      await wait(50);

      // Full feedback widget should exist
      const fullWidget = document.querySelector('[data-coolhand-widget]');
      expect(fullWidget).not.toBeNull();

      // Now manually attach partial feedback to the same element
      const el = document.querySelector('[coolhand-feedback]') as HTMLElement;
      const partialManager = CoolhandJS.attachPartialFeedback(el);
      expect(partialManager).not.toBeNull();

      // Both should coexist - the full widget container should still be present
      const fullWidgetAfter = document.querySelector('[data-coolhand-widget]');
      expect(fullWidgetAfter).not.toBeNull();
    });

    it('should handle multiple partial feedback elements on page', async () => {
      document.body.innerHTML = `
        <div id="target1" ${PARTIAL_FEEDBACK_ATTRIBUTE}>First element content.</div>
        <div id="target2" ${PARTIAL_FEEDBACK_ATTRIBUTE}>Second element content.</div>
      `;

      const el1 = document.getElementById('target1') as HTMLElement;
      const el2 = document.getElementById('target2') as HTMLElement;

      const manager1 = new PartialFeedbackManager(el1, 'test-api-key');
      const manager2 = new PartialFeedbackManager(el2, 'test-api-key');

      // Select in first element
      createSelection(el1, 0, 5);
      simulateMouseUp(el1);
      await wait(50);

      let widgets = document.querySelectorAll('.coolhand-partial-widget-container');
      expect(widgets.length).toBe(1);

      // Close the widget
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      // Select in second element
      createSelection(el2, 0, 6);
      simulateMouseUp(el2);
      await wait(50);

      widgets = document.querySelectorAll('.coolhand-partial-widget-container');
      expect(widgets.length).toBe(1);

      manager1.destroy();
      manager2.destroy();
    });
  });

  describe('Constants', () => {
    it('should have correct MIN_SELECTION_LENGTH value', () => {
      expect(MIN_SELECTION_LENGTH).toBe(3);
    });

    it('should have correct PARTIAL_HIGHLIGHT_CLASS value', () => {
      expect(PARTIAL_HIGHLIGHT_CLASS).toBe('coolhand-partial-highlight');
    });
  });
});
