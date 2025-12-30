import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FeedbackWidget } from '../src/feedback-widget';
import { COOLHAND_API_URL, VERSION } from '../src/constants';

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

    it('should include session ID when provided', async () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        sessionId: 'session-123',
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
          body: expect.stringContaining('"client_unique_id":"session-123"'),
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

});
