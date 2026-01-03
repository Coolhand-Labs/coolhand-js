import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FeedbackWidget } from '../src/feedback-widget';
import { COOLHAND_API_URL, VERSION, FEEDBACK_ID_ATTRIBUTE, ORIGINAL_OUTPUT_ATTRIBUTE, WIDGET_VISIBILITY_ATTRIBUTE, DEBOUNCE_MS } from '../src/constants';

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn() as jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

describe('FeedbackWidget', () => {
  let element: HTMLElement;
  let widget: FeedbackWidget;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockFetch.mockClear();

    element = document.createElement('div');
    element.textContent = 'Test content for feedback';
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (widget) {
      widget.destroy();
    }
  });

  describe('constructor', () => {
    it('should create widget with shadow DOM when supported', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();
      expect(container?.shadowRoot).not.toBeNull();
    });

    it('should set position relative on target element', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      expect(element.style.position).toBe('relative');
    });
  });

  describe('render', () => {
    it('should render trigger button with waving hand icon', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger');
      const handIcon = shadowRoot?.querySelector('.coolhand-icon-trigger');

      expect(trigger).not.toBeNull();
      expect(handIcon).not.toBeNull();
    });

    it('should render feedback options with SVG icons', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const options = shadowRoot?.querySelectorAll('.coolhand-option');

      expect(options?.length).toBe(3);
      // Check that each option has an SVG icon
      options?.forEach((option) => {
        expect(option.querySelector('svg')).not.toBeNull();
      });
    });

    it('should render prompt text "Was this useful?"', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const prompt = shadowRoot?.querySelector('.coolhand-prompt');

      expect(prompt).not.toBeNull();
      expect(prompt?.textContent).toBe("Was this useful?");
    });

    it('should render close button', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const closeBtn = shadowRoot?.querySelector('.coolhand-close');

      expect(closeBtn).not.toBeNull();
    });
  });

  describe('toggle options', () => {
    it('should expand options when trigger is clicked', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      trigger?.click();

      expect(options?.classList.contains('expanded')).toBe(true);
      expect(trigger?.style.display).toBe('none');
    });

    it('should collapse options when close button is clicked', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const closeBtn = shadowRoot?.querySelector('.coolhand-close') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      // First expand
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Then close
      closeBtn?.click();
      expect(options?.classList.contains('expanded')).toBe(false);
      expect(trigger?.style.display).toBe('flex');
    });
  });

  describe('feedback submission', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            like: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
      });
    });

    it('should send feedback when option is clicked', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector(
        '[data-feedback="down"]'
      ) as HTMLElement;

      // Expand options
      trigger?.click();

      // Click thumbs down
      thumbsDown?.click();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(COOLHAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
          Accept: 'application/json',
        },
        body: expect.stringContaining('"like":false'),
      });
    });

    it('should include clientUniqueId when provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        clientUniqueId: 'client-123',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining('"client_unique_id":"client-123"'),
        })
      );
    });

    it('should include workload_hashid when workloadId is provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        workloadId: 'abc123def456',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining('"workload_hashid":"abc123def456"'),
        })
      );
    });

    it('should NOT include workload_hashid when workloadId is not provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify workload_hashid is not in the payload
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.not.stringContaining('workload_hashid'),
        })
      );
    });

    it('should include collector version in payload', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const neutral = shadowRoot?.querySelector(
        '[data-feedback="neutral"]'
      ) as HTMLElement;

      trigger?.click();
      neutral?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining(`"collector":"coolhand-js-${VERSION}"`),
        })
      );
    });

    it('should set data-coolhand-feedback-id on element after successful submission', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            like: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
      });

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      // Verify no feedback ID initially
      expect(element.getAttribute('data-coolhand-feedback-id')).toBeNull();

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify feedback ID is set after submission
      expect(element.getAttribute('data-coolhand-feedback-id')).toBe('12345');
    });

    it('should use PATCH to update when data-coolhand-feedback-id exists', async () => {
      // Set existing feedback ID on the element
      element.setAttribute('data-coolhand-feedback-id', '99999');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector(
        '[data-feedback="down"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsDown?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify PATCH was called with the feedback ID in the URL
      expect(mockFetch).toHaveBeenCalledWith(
        `${COOLHAND_API_URL}/99999`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"like":false'),
        })
      );
    });

    it('should use POST to create when no data-coolhand-feedback-id exists', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify POST was called to the base URL
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not overwrite feedback ID on update', async () => {
      // Set existing feedback ID
      element.setAttribute('data-coolhand-feedback-id', '99999');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 99999,
            like: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          }),
      });

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector(
        '[data-feedback="down"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsDown?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify feedback ID remains unchanged (not overwritten)
      expect(element.getAttribute('data-coolhand-feedback-id')).toBe('99999');
    });

    it('should call onSuccess callback on successful submission', async () => {
      const onSuccess = jest.fn();

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        onSuccess,
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onSuccess).toHaveBeenCalledWith(true, expect.any(Object));
    });

    it('should call onError callback on failed submission', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const onError = jest.fn();

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        onError,
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector(
        '[data-feedback="down"]'
      ) as HTMLElement;

      trigger?.click();
      thumbsDown?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should close options panel after selection', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;

      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      thumbsUp?.click();
      expect(options?.classList.contains('expanded')).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should remove widget from DOM', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      expect(element.querySelector('[data-coolhand-widget]')).not.toBeNull();

      widget.destroy();

      expect(element.querySelector('[data-coolhand-widget]')).toBeNull();
    });
  });

  describe('non-Shadow DOM fallback', () => {
    it('should render without Shadow DOM when not supported', () => {
      // Mock attachShadow to simulate no Shadow DOM support
      const originalAttachShadow = Element.prototype.attachShadow;
      // @ts-expect-error Mocking attachShadow
      document.head.attachShadow = undefined;

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();
      // Without shadow DOM, elements are directly in the container
      expect(container?.shadowRoot).toBeNull();
      expect(container?.querySelector('.coolhand-trigger')).not.toBeNull();

      // Restore
      document.head.attachShadow = originalAttachShadow;
    });
  });

  describe('click outside to close', () => {
    it('should close options when clicking outside the widget', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      // Expand options
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Click outside (on body)
      document.body.click();

      expect(options?.classList.contains('expanded')).toBe(false);
      expect(trigger?.style.display).toBe('flex');
    });

    it('should not close options when clicking inside the widget', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;

      // Expand options
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Dispatch a click event on the document that originates from inside the shadowRoot
      // The widget's document click handler checks if the shadowRoot contains the target
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper') as HTMLElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: wrapper, writable: false });
      document.dispatchEvent(clickEvent);

      // Options should still be expanded because click was inside the widget
      expect(options?.classList.contains('expanded')).toBe(true);
    });
  });

  describe('toggle options', () => {
    it('should close options when trigger is clicked while expanded', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      // First click - expand
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Make trigger visible again to simulate toggle scenario
      if (trigger) trigger.style.display = 'flex';

      // Second click - should collapse via toggle
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(false);
    });
  });

  describe('CORS error handling', () => {
    it('should log CORS-specific error message', async () => {
      mockFetch.mockRejectedValue(new Error('CORS error: blocked'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CORS error detected')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('keyboard navigation', () => {
    it('should close options when Escape is pressed on trigger while expanded', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      // Expand options
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Press Escape on trigger
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      trigger?.dispatchEvent(escapeEvent);

      expect(options?.classList.contains('expanded')).toBe(false);
    });

    it('should close options when global Escape is pressed while expanded', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      // Expand options
      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      // Press Escape on document
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);

      expect(options?.classList.contains('expanded')).toBe(false);
    });

    it('should navigate to next option with ArrowRight', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      // Expand options
      trigger?.click();

      // Focus first button
      (buttons?.[0] as HTMLElement)?.focus();

      // Press ArrowRight on options panel
      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      // In Shadow DOM, use shadowRoot.activeElement
      expect(shadowRoot?.activeElement).toBe(buttons?.[1]);
    });

    it('should navigate to next option with ArrowDown', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      trigger?.click();
      (buttons?.[0] as HTMLElement)?.focus();

      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      expect(shadowRoot?.activeElement).toBe(buttons?.[1]);
    });

    it('should navigate to previous option with ArrowLeft', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      trigger?.click();
      (buttons?.[1] as HTMLElement)?.focus();

      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      expect(shadowRoot?.activeElement).toBe(buttons?.[0]);
    });

    it('should navigate to previous option with ArrowUp', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      trigger?.click();
      (buttons?.[1] as HTMLElement)?.focus();

      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      expect(shadowRoot?.activeElement).toBe(buttons?.[0]);
    });

    it('should wrap from last to first option with ArrowRight', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      trigger?.click();
      (buttons?.[2] as HTMLElement)?.focus(); // Focus last button

      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      expect(shadowRoot?.activeElement).toBe(buttons?.[0]); // Should wrap to first
    });

    it('should wrap from first to last option with ArrowLeft', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');

      trigger?.click();
      (buttons?.[0] as HTMLElement)?.focus(); // Focus first button

      const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
      optionsPanel?.dispatchEvent(arrowEvent);

      expect(shadowRoot?.activeElement).toBe(buttons?.[2]); // Should wrap to last
    });

    it('should close options and return focus to trigger on Escape in options panel', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options') as HTMLElement;
      const options = shadowRoot?.querySelector('.coolhand-options');

      trigger?.click();
      expect(options?.classList.contains('expanded')).toBe(true);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      optionsPanel?.dispatchEvent(escapeEvent);

      expect(options?.classList.contains('expanded')).toBe(false);
      expect(shadowRoot?.activeElement).toBe(trigger);
    });
  });

  describe('checkmark animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
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
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show and then hide checkmark after successful submission', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      // Wait for fetch to complete
      await Promise.resolve();
      await Promise.resolve();

      // Checkmark should be showing
      expect(trigger?.classList.contains('showing-checkmark')).toBe(true);

      // Advance timers by 800ms
      jest.advanceTimersByTime(800);

      // Checkmark should be hidden
      expect(trigger?.classList.contains('showing-checkmark')).toBe(false);
    });
  });

  describe('workloadId support', () => {
    beforeEach(() => {
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
    });

    it('should include workload_hashid when workloadId is provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        workloadId: 'abc123def456',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining('"workload_hashid":"abc123def456"'),
        })
      );
    });

    it('should not include workload_hashid when workloadId is not provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.not.stringContaining('workload_hashid'),
        })
      );
    });
  });

  describe('feedback ID tracking and PATCH updates', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            like: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          }),
      });
    });

    it('should store feedback ID on element after successful submission', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.getAttribute(FEEDBACK_ID_ATTRIBUTE)).toBe('12345');
    });

    it('should use PATCH method when feedback ID already exists', async () => {
      // Set existing feedback ID
      element.setAttribute(FEEDBACK_ID_ATTRIBUTE, '99999');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector('[data-feedback="down"]') as HTMLElement;

      trigger?.click();
      thumbsDown?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        `${COOLHAND_API_URL}/99999`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should use POST method when no feedback ID exists', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsUp = shadowRoot?.querySelector('[data-feedback="up"]') as HTMLElement;

      trigger?.click();
      thumbsUp?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not overwrite feedback ID on PATCH update', async () => {
      // Set existing feedback ID
      element.setAttribute(FEEDBACK_ID_ATTRIBUTE, '99999');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
      const thumbsDown = shadowRoot?.querySelector('[data-feedback="down"]') as HTMLElement;

      trigger?.click();
      thumbsDown?.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still have the original ID, not the one from response
      expect(element.getAttribute(FEEDBACK_ID_ATTRIBUTE)).toBe('99999');
    });
  });

  describe('textarea/input support', () => {
    let textareaElement: HTMLTextAreaElement;
    let inputElement: HTMLInputElement;

    beforeEach(() => {
      jest.useFakeTimers();
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
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should detect textarea elements and wrap them', () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Initial textarea content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Initial textarea content', 'test-api-key');

      // Textarea should be wrapped
      const wrapper = textareaElement.parentElement;
      expect(wrapper?.classList.contains('coolhand-input-wrapper')).toBe(true);

      // Widget container should be in the wrapper
      const container = wrapper?.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();
    });

    it('should detect input elements and wrap them', () => {
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.value = 'Initial input content';
      document.body.appendChild(inputElement);

      widget = new FeedbackWidget(inputElement, 'Initial input content', 'test-api-key');

      // Input should be wrapped
      const wrapper = inputElement.parentElement;
      expect(wrapper?.classList.contains('coolhand-input-wrapper')).toBe(true);

      // Widget container should be in the wrapper
      const container = wrapper?.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();
    });

    it('should store original output in data attribute for textarea', () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original textarea content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original textarea content', 'test-api-key');

      expect(textareaElement.getAttribute(ORIGINAL_OUTPUT_ATTRIBUTE)).toBe('Original textarea content');
    });

    it('should auto-POST feedback on first edit to textarea', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Change the textarea value (first edit)
      textareaElement.value = 'Modified content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      // Should not call fetch immediately (debounce)
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance timers past debounce
      jest.advanceTimersByTime(DEBOUNCE_MS);

      // Wait for async operations
      await Promise.resolve();
      await Promise.resolve();

      // Should POST (create) since no feedback ID exists yet
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"original_output":"Original content"'),
        })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining('"revised_output":"Modified content"'),
        })
      );

      // Should have set the feedback ID on the element
      expect(textareaElement.getAttribute(FEEDBACK_ID_ATTRIBUTE)).toBe('1');
    });

    it('should PATCH on subsequent edits after first POST', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // First edit - triggers POST
      textareaElement.value = 'First edit';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({ method: 'POST' })
      );
      mockFetch.mockClear();

      // Second edit - should trigger PATCH
      textareaElement.value = 'Second edit';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
      jest.advanceTimersByTime(DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledWith(
        `${COOLHAND_API_URL}/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"revised_output":"Second edit"'),
        })
      );
    });

    it('should debounce multiple rapid changes', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Rapid changes
      textareaElement.value = 'Change 1';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(500); // Half the debounce time

      textareaElement.value = 'Change 2';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(500); // Another half

      textareaElement.value = 'Final change';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      // Still shouldn't have called fetch
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance past full debounce time
      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      // Should only call once with final value
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          body: expect.stringContaining('"revised_output":"Final change"'),
        })
      );
    });

    it('should not send if value has not changed from original', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Change and then change back to original
      textareaElement.value = 'Modified content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      textareaElement.value = 'Original content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      // Advance timers past debounce
      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      // Should not have called fetch since value is same as original
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call onRevisedOutput callback when revised output is sent', async () => {
      const onRevisedOutput = jest.fn();

      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key', {
        onRevisedOutput,
      });

      // Change the textarea value
      textareaElement.value = 'New content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      expect(onRevisedOutput).toHaveBeenCalledWith('New content', expect.any(Object));
    });

    it('should clean up input and blur listeners on destroy', () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      const removeEventListenerSpy = jest.spyOn(textareaElement, 'removeEventListener');

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');
      widget.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    });

    it('should send immediately on blur without waiting for debounce', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          like: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      });

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Change the textarea value
      textareaElement.value = 'New content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      // Don't advance timers - just blur immediately
      textareaElement.dispatchEvent(new Event('blur', { bubbles: true }));

      await Promise.resolve();
      await Promise.resolve();

      // Should have sent immediately without waiting for debounce
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should cancel debounce timer when blur occurs', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          like: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      });

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Change the textarea value
      textareaElement.value = 'New content';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      // Blur before debounce timer fires
      textareaElement.dispatchEvent(new Event('blur', { bubbles: true }));

      await Promise.resolve();
      await Promise.resolve();

      // Now advance past the debounce time
      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      // Should only have sent once (on blur), not twice
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should resume debouncing and PATCH when user clicks back in after blur', async () => {
      textareaElement = document.createElement('textarea');
      textareaElement.value = 'Original content';
      document.body.appendChild(textareaElement);

      // First call returns feedback ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 999,
          like: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      });

      // Second call for PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 999,
          like: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z',
        }),
      });

      widget = new FeedbackWidget(textareaElement, 'Original content', 'test-api-key');

      // Step 1: Edit and blur (triggers POST)
      textareaElement.value = 'First edit';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
      textareaElement.dispatchEvent(new Event('blur', { bubbles: true }));

      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenLastCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({ method: 'POST' })
      );

      // Verify feedback ID was stored
      expect(textareaElement.getAttribute(FEEDBACK_ID_ATTRIBUTE)).toBe('999');

      // Step 2: Click back in and edit again (should PATCH after debounce)
      textareaElement.value = 'Second edit';
      textareaElement.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        `${COOLHAND_API_URL}/999`,
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('Widget Visibility', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not render widget UI when data-coolhand-widget-visibility="hide"', () => {
      const element = document.createElement('div');
      element.textContent = 'Test content';
      element.setAttribute(WIDGET_VISIBILITY_ATTRIBUTE, 'hide');
      document.body.appendChild(element);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      // No widget container should be created
      expect(element.querySelector('.coolhand-feedback-container')).toBeNull();
      // No shadow root either
      expect(element.shadowRoot).toBeNull();
    });

    it('should still track input changes when widget is hidden on textarea', async () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Original content';
      textarea.setAttribute(WIDGET_VISIBILITY_ATTRIBUTE, 'hide');
      document.body.appendChild(textarea);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 1,
          like: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      });

      widget = new FeedbackWidget(textarea, 'Original content', 'test-api-key');

      // No widget UI should be rendered
      expect(document.querySelector('.coolhand-feedback-container')).toBeNull();

      // But input monitoring should still work
      textarea.value = 'Edited content';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      jest.advanceTimersByTime(DEBOUNCE_MS);

      await Promise.resolve();
      await Promise.resolve();

      // Should still send the API request
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        COOLHAND_API_URL,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Edited content'),
        })
      );

      textarea.remove();
    });

    it('should render widget UI normally when attribute is not set', () => {
      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      // Widget should be rendered (check inside the element)
      expect(element.querySelector('.coolhand-feedback-container')).not.toBeNull();
    });

    it('should render widget UI when attribute has value other than "hide"', () => {
      const element = document.createElement('div');
      element.textContent = 'Test content';
      element.setAttribute(WIDGET_VISIBILITY_ATTRIBUTE, 'show');
      document.body.appendChild(element);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      // Widget should still be rendered
      expect(element.querySelector('.coolhand-feedback-container')).not.toBeNull();
    });
  });

});
