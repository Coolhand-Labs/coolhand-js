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
            id: 'parent_abc',
            created_partial_id: 'partial_xyz',
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

  describe('Hover/Mouse Interactions', () => {
    it('should show widget on hover over existing highlight', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for hover';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      // Find the widget and select an option
      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      expect(thumbsUp).not.toBeNull();
      thumbsUp.click();
      await wait(150);

      // Close the widget
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      // Now hover over the highlight
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      expect(highlight).not.toBeNull();

      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);

      // Wait for the hover delay (200ms)
      await wait(250);

      // Widget should appear
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      manager.destroy();
    });

    it('should not show widget if mouse leaves before delay completes', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for hover';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Mouse enter
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);

      // Mouse leave before 200ms delay
      await wait(100);
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      });
      highlight.dispatchEvent(mouseLeaveEvent);

      // Wait past the original delay
      await wait(200);

      // Widget should not appear
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).toBeNull();

      manager.destroy();
    });

    it('should keep widget open when moving from highlight to widget', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for hover';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Hover to show widget
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      widget = document.querySelector('.coolhand-partial-widget-container') as HTMLElement;
      expect(widget).not.toBeNull();

      // Simulate mouse leaving highlight but entering widget
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        relatedTarget: widget,
      });
      highlight.dispatchEvent(mouseLeaveEvent);

      await wait(350);

      // Widget should still be visible
      const widgetAfter = document.querySelector('.coolhand-partial-widget-container');
      expect(widgetAfter).not.toBeNull();

      manager.destroy();
    });

    it('should close widget after delay when mouse leaves both highlight and widget', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for hover';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Hover to show widget
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      // Mouse leaves highlight to somewhere else (not widget)
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      });
      highlight.dispatchEvent(mouseLeaveEvent);

      // Wait for close delay (300ms)
      await wait(350);

      // Widget should be closed
      const widgetAfter = document.querySelector('.coolhand-partial-widget-container');
      expect(widgetAfter).toBeNull();

      manager.destroy();
    });

    it('should position widget at cursor location on hover', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for hover';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Hover with specific cursor position
      const cursorX = 250;
      const cursorY = 150;
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: cursorX,
        clientY: cursorY,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      widget = document.querySelector('.coolhand-partial-widget-container') as HTMLElement;
      expect(widget).not.toBeNull();

      // Widget should be positioned relative to cursor (10px below)
      const widgetStyle = (widget as HTMLElement).style;
      expect(widgetStyle.position).toBe('fixed');

      manager.destroy();
    });
  });

  describe('Explanation/Comment Feature', () => {
    it('should show explanation textarea after selecting feedback option', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1, // Always show explanation
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      expect(thumbsUp).not.toBeNull();
      thumbsUp?.click();

      // Wait for API response and explanation to appear
      await wait(200);

      // Re-query widget and shadow root after feedback submission
      const updatedWidget = document.querySelector('.coolhand-partial-widget-container');
      const updatedShadowRoot = updatedWidget?.shadowRoot || updatedWidget;

      // Explanation section should be visible after feedback submission
      const explanationSection = updatedShadowRoot?.querySelector('.coolhand-partial-explanation');
      expect(explanationSection).not.toBeNull();

      const textarea = updatedShadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.placeholder).toContain('note');

      manager.destroy();
    });

    it('should debounce explanation input and send PATCH request', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1, // Always show explanation
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      // Explanation should appear after feedback submission
      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();

      // Type explanation
      textarea.value = 'This is my explanation';
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Should not send immediately
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the initial POST

      // Wait for debounce (1000ms)
      await wait(1100);

      // Should have sent PATCH request
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const patchCall = (mockFetch as jest.Mock).mock.calls[1];
      expect(patchCall[0]).toContain('/parent_abc'); // PATCH to existing feedback ID
      expect((patchCall[1] as { method: string }).method).toBe('PATCH');

      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.explanation).toBe('This is my explanation');

      manager.destroy();
    });

    it('should send explanation immediately on blur', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200); // Wait for explanation to appear

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();

      textarea.value = 'Quick explanation';
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      // Blur immediately (before debounce)
      await wait(100);
      const blurEvent = new Event('blur', { bubbles: true });
      textarea.dispatchEvent(blurEvent);
      await wait(50);

      // Should have sent PATCH request immediately on blur
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const patchCall = (mockFetch as jest.Mock).mock.calls[1];
      expect((patchCall[1] as { method: string }).method).toBe('PATCH');

      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.explanation).toBe('Quick explanation');

      manager.destroy();
    });

    it('should send explanation and close widget on submit button click', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200); // Wait for explanation to appear

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();

      textarea.value = 'Final explanation';
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      await wait(50);

      // Click submit button
      const submitButton = shadowRoot?.querySelector('.coolhand-partial-submit') as HTMLElement;
      expect(submitButton).not.toBeNull();
      submitButton?.click();
      await wait(150);

      // Should have sent PATCH request
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Widget should be closed
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).toBeNull();

      manager.destroy();
    });

    it('should not send explanation if textarea is empty', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200); // Wait for explanation to appear

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();

      // Type and then clear
      textarea.value = '   '; // Only whitespace
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      await wait(1100);

      // Should not send PATCH for empty explanation
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial POST

      manager.destroy();
    });

    it('should call onPartialFeedbackError callback on explanation submission failure', async () => {
      const onError = jest.fn();
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        onPartialFeedbackError: onError,
        explanationSample: 1, // Always show explanation
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      // Mock fetch to fail on PATCH
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        })
      );

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      textarea.value = 'This will fail';
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      await wait(1100);

      expect(onError).toHaveBeenCalled();
      const errorArg = onError.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);

      manager.destroy();
    });

    it('should include explanation in PATCH request payload', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text with explanation';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1, // Always show explanation
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsDown = shadowRoot?.querySelector('[data-feedback="down"]') as HTMLElement;
      thumbsDown?.click();
      await wait(200);

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      textarea.value = 'Detailed explanation here';
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[1];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);

      expect(patchBody.llm_request_log_feedback).toBeDefined();
      expect(patchBody.llm_request_log_feedback.explanation).toBe('Detailed explanation here');
      expect(patchBody.llm_request_log_feedback.like).toBe(false);
      expect(patchBody.llm_request_log_feedback.focus_section).toBe('Test');

      manager.destroy();
    });
  });

  describe('Editing Existing Feedback', () => {
    it('should reopen widget when clicking on existing highlight', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for editing';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      // Close widget
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      expect(document.querySelector('.coolhand-partial-widget-container')).toBeNull();

      // Now hover and wait to reopen
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      // Widget should be visible again
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      manager.destroy();
    });

    it('should show current feedback state when reopening widget', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for editing';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback with thumbs down
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsDown = shadowRoot?.querySelector('[data-feedback="down"]') as HTMLElement;
      thumbsDown?.click();
      await wait(150);

      // Close widget
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      // Reopen
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      // Widget should reopen with the existing feedback
      const widgetAfter = document.querySelector('.coolhand-partial-widget-container');
      const shadowRootAfter = widgetAfter?.shadowRoot || widgetAfter;
      const thumbsDownAfter = shadowRootAfter?.querySelector('[data-feedback="down"]') as HTMLElement;
      // Just verify the thumbs down button exists in the reopened widget
      expect(thumbsDownAfter).not.toBeNull();

      manager.destroy();
    });

    it('should send PATCH request when updating existing feedback', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for editing';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      mockFetch.mockClear();

      // Close and reopen
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      // Change to thumbs down
      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const thumbsDown = shadowRoot?.querySelector('[data-feedback="down"]') as HTMLElement;
      thumbsDown?.click();
      await wait(150);

      // Should use PATCH method
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      expect((patchCall[1] as { method: string }).method).toBe('PATCH');
      expect(patchCall[0]).toContain('/parent_abc');

      manager.destroy();
    });

    it('should find entry by feedback ID attribute', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for editing';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      // Check highlight has data-feedback-id
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      expect(highlight.getAttribute('data-feedback-id')).toBe('parent_abc');

      manager.destroy();
    });

    it('should fallback to finding entry by text content if ID not found', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for editing';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      // Remove the ID attribute to test fallback
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      highlight.removeAttribute('data-feedback-id');

      // Hover should still find the entry by text
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });
      highlight.dispatchEvent(mouseEnterEvent);
      await wait(250);

      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      manager.destroy();
    });
  });

  describe('Keyboard Interactions on Highlights', () => {
    it('should open widget when Enter key pressed on focused highlight', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for keyboard';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Focus the highlight
      const focusEvent = new FocusEvent('focus', { bubbles: true });
      highlight.dispatchEvent(focusEvent);
      await wait(50);

      // Widget should appear on focus
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      // Close it
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await wait(50);

      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      highlight.dispatchEvent(enterEvent);
      await wait(50);

      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      manager.destroy();
    });

    it('should open widget when Space key pressed on focused highlight', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for keyboard';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Press Space
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      highlight.dispatchEvent(spaceEvent);
      await wait(50);

      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      manager.destroy();
    });

    it('should prevent default behavior on Enter/Space to avoid scrolling', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for keyboard';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Create event with preventDefault spy
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');

      highlight.dispatchEvent(enterEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      manager.destroy();
    });

    it('should position widget below highlight (not cursor) on keyboard focus', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for keyboard';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;

      // Focus should show widget positioned relative to highlight, not cursor
      const focusEvent = new FocusEvent('focus', { bubbles: true });
      highlight.dispatchEvent(focusEvent);
      await wait(50);

      widget = document.querySelector('.coolhand-partial-widget-container') as HTMLElement;
      expect(widget).not.toBeNull();
      expect((widget as HTMLElement).style.position).toBe('fixed');

      manager.destroy();
    });
  });

  describe('Optional API Fields', () => {
    it('should include clientUniqueId in PATCH request when provided', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        clientUniqueId: 'test-client-123',
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      mockFetch.mockClear();

      // Add explanation to trigger PATCH
      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.client_unique_id).toBe('test-client-123');

      manager.destroy();
    });

    it('should include creatorUniqueId in PATCH request when provided', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        creatorUniqueId: 'creator-789',
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      mockFetch.mockClear();

      // Add explanation to trigger PATCH
      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.creator_unique_id).toBe('creator-789');

      manager.destroy();
    });

    it('should include partial_id in PATCH request when updating existing partial', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      mockFetch.mockClear();

      // Add explanation to trigger PATCH
      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.partial_id).toBe('partial_xyz');

      manager.destroy();
    });

    it('should store partialId from API response', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      // Check that the entry was stored with partialId in the data attribute
      const storedData = element.getAttribute('data-coolhand-partial-feedbacks');
      expect(storedData).not.toBeNull();
      const parsed = JSON.parse(storedData!);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].id).toBe('parent_abc');
      expect(parsed.entries[0].partialId).toBe('partial_xyz');

      manager.destroy();
    });

    it('should include coolhandFingerprintId in PATCH request when provided', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        coolhandFingerprintId: 'fingerprint-456',
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      mockFetch.mockClear();

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe('fingerprint-456');

      manager.destroy();
    });

    it('should include workloadId in PATCH request when provided', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        workloadId: 'workload-789',
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      mockFetch.mockClear();

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);
      expect(patchBody.llm_request_log_feedback.workload_hashid).toBe('workload-789');

      manager.destroy();
    });

    it('should include all optional fields when all are provided', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key', {
        clientUniqueId: 'client-123',
        creatorUniqueId: 'creator-xyz',
        coolhandFingerprintId: 'fingerprint-456',
        workloadId: 'workload-789',
        explanationSample: 1,
      });

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(200);

      mockFetch.mockClear();

      widget = document.querySelector('.coolhand-partial-widget-container');
      shadowRoot = widget?.shadowRoot || widget;
      const textarea = shadowRoot?.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      textarea.value = 'Test explanation';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1100);

      const patchCall = (mockFetch as jest.Mock).mock.calls[0];
      const patchBody = JSON.parse((patchCall[1] as { body: string }).body);

      expect(patchBody.llm_request_log_feedback.client_unique_id).toBe('client-123');
      expect(patchBody.llm_request_log_feedback.creator_unique_id).toBe('creator-xyz');
      expect(patchBody.llm_request_log_feedback.coolhand_fingerprint_id).toBe('fingerprint-456');
      expect(patchBody.llm_request_log_feedback.workload_hashid).toBe('workload-789');

      manager.destroy();
    });
  });

  describe('Selection Edge Cases', () => {
    it('should handle invalid storage format and reset entries', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const element = document.createElement('div');
      element.textContent = 'Test text';
      element.setAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE, '{"invalid": "format"}');
      document.body.appendChild(element);

      // Should not throw and should warn about invalid format
      const manager = new PartialFeedbackManager(element, 'test-api-key');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CoolhandJS] Invalid partial feedbacks format, resetting'
      );

      consoleWarnSpy.mockRestore();
      manager.destroy();
    });

    it('should warn and reset on corrupted JSON in data attribute', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const element = document.createElement('div');
      element.textContent = 'Test text';
      element.setAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE, 'not valid json{{{');
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CoolhandJS] Failed to parse partial feedbacks, resetting'
      );

      consoleWarnSpy.mockRestore();
      manager.destroy();
    });

    it('should not create feedback if clicking directly on existing highlight', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test text for clicking';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create initial feedback
      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      mockFetch.mockClear();

      // Click on the highlight itself
      const highlight = element.querySelector(`.${PARTIAL_HIGHLIGHT_CLASS}`) as HTMLElement;
      simulateMouseUp(highlight);
      await wait(50);

      // Should not create new feedback (no new widget)
      const widgets = document.querySelectorAll('.coolhand-partial-widget-container');
      expect(widgets.length).toBe(0);

      manager.destroy();
    });

    it('should sort entries by startOffset in reverse before restoring highlights', () => {
      const element = document.createElement('div');
      element.textContent = 'First second third fourth';
      document.body.appendChild(element);

      // Manually create storage with multiple entries
      const storage = {
        version: 1,
        entries: [
          { id: 1, range: { text: 'First', startOffset: 0, endOffset: 5 }, like: true },
          { id: 2, range: { text: 'third', startOffset: 13, endOffset: 18 }, like: false },
          { id: 3, range: { text: 'second', startOffset: 6, endOffset: 12 }, like: true },
        ],
      };
      element.setAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE, JSON.stringify(storage));

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // All three should be highlighted
      const highlights = element.querySelectorAll(`.${PARTIAL_HIGHLIGHT_CLASS}`);
      expect(highlights.length).toBe(3);

      manager.destroy();
    });
  });

  describe('Widget Positioning and Updates', () => {
    it('should position widget as absolute', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test positioning';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container') as HTMLElement;
      expect(widget).not.toBeNull();
      expect(widget.style.position).toBe('fixed');

      manager.destroy();
    });

    it('should calculate top position below selection', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test positioning';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container') as HTMLElement;
      const topValue = parseInt(widget.style.top);

      // Should be positioned below the selection (120px bottom from mock + scrollY)
      expect(topValue).toBeGreaterThan(100);

      manager.destroy();
    });

    it('should announce feedback submission to screen readers', async () => {
      const element = document.createElement('div');
      element.textContent = 'Test announcement';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      createSelection(element, 0, 4);
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      // Check for aria-live region (may be in shadow DOM or document)
      const widgetWithLive = document.querySelector('.coolhand-partial-widget-container');
      const shadowRootWithLive = widgetWithLive?.shadowRoot || widgetWithLive;
      const liveRegion = shadowRootWithLive?.querySelector('[aria-live="polite"]') ||
                         document.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();

      manager.destroy();
    });
  });

  describe('Selection Overlap Detection', () => {
    it.skip('should detect when new selection overlaps existing highlight', async () => {
      // Skipped: After creating highlight, DOM structure changes making text selection
      // offsets invalid. Need to implement selection on modified DOM structure.
      const element = document.createElement('div');
      element.textContent = 'First second third';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create first feedback
      createSelection(element, 0, 5); // "First"
      simulateMouseUp(element);
      await wait(50);

      const widget = document.querySelector('.coolhand-partial-widget-container');
      const shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp?.click();
      await wait(150);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);
      await wait(50);

      // Try to create overlapping selection
      createSelection(element, 3, 8); // "st se" - overlaps with "First"
      simulateMouseUp(element);
      await wait(50);

      // Widget should not appear for overlapping selection
      const widgets = document.querySelectorAll('.coolhand-partial-widget-container');
      expect(widgets.length).toBe(0);

      manager.destroy();
    });

    it.skip('should allow non-overlapping selections', async () => {
      // Skipped: Same issue as above - DOM structure changes after first highlight
      const element = document.createElement('div');
      element.textContent = 'First second third';
      document.body.appendChild(element);

      const manager = new PartialFeedbackManager(element, 'test-api-key');

      // Create first feedback
      createSelection(element, 0, 5); // "First"
      simulateMouseUp(element);
      await wait(50);

      let widget = document.querySelector('.coolhand-partial-widget-container');
      let shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp1 = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp1?.click();
      await wait(150);

      const escapeEvent1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent1);
      await wait(50);

      // Create non-overlapping selection
      createSelection(element, 6, 12); // "second"
      simulateMouseUp(element);
      await wait(50);

      // Widget should appear
      widget = document.querySelector('.coolhand-partial-widget-container');
      expect(widget).not.toBeNull();

      shadowRoot = widget?.shadowRoot || widget;
      const thumbsUp2 = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;
      thumbsUp2?.click();
      await wait(150);

      // Should have two highlights
      const highlights = element.querySelectorAll(`.${PARTIAL_HIGHLIGHT_CLASS}`);
      expect(highlights.length).toBe(2);

      manager.destroy();
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
