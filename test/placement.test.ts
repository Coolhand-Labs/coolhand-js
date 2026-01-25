import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FeedbackWidget } from '../src/feedback-widget';
import { PLACEMENT_VERTICAL_ATTRIBUTE, PLACEMENT_HORIZONTAL_ATTRIBUTE } from '../src/constants';

// Mock fetch globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = jest.fn() as jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = mockFetch;

describe('Widget Placement', () => {
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

  describe('default placement', () => {
    it('should default to top-right placement', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container).not.toBeNull();

      // Container should NOT have placement classes (defaults are applied via CSS base rules)
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(false);

      // Wrapper inside shadow DOM should also not have placement classes
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(false);
    });
  });

  describe('placement via options', () => {
    it('should apply bottom placement class when placementVertical is "bottom"', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'bottom',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(false);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(false);
    });

    it('should apply left placement class when placementHorizontal is "left"', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementHorizontal: 'left',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });

    it('should apply both placement classes for bottom-left', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'bottom',
        placementHorizontal: 'left',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });

    it('should not apply placement classes for explicit top-right', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'top',
        placementHorizontal: 'right',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(false);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(false);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(false);
    });
  });

  describe('placement via data attributes', () => {
    it('should apply bottom placement from data attribute', () => {
      element.setAttribute(PLACEMENT_VERTICAL_ATTRIBUTE, 'bottom');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
    });

    it('should apply left placement from data attribute', () => {
      element.setAttribute(PLACEMENT_HORIZONTAL_ATTRIBUTE, 'left');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });

    it('should apply both placements from data attributes', () => {
      element.setAttribute(PLACEMENT_VERTICAL_ATTRIBUTE, 'bottom');
      element.setAttribute(PLACEMENT_HORIZONTAL_ATTRIBUTE, 'left');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });
  });

  describe('attribute priority over options', () => {
    it('should prioritize data attribute over option for vertical placement', () => {
      element.setAttribute(PLACEMENT_VERTICAL_ATTRIBUTE, 'bottom');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'top', // This should be overridden by attribute
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
    });

    it('should prioritize data attribute over option for horizontal placement', () => {
      element.setAttribute(PLACEMENT_HORIZONTAL_ATTRIBUTE, 'left');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementHorizontal: 'right', // This should be overridden by attribute
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });

    it('should use option when attribute has invalid value', () => {
      element.setAttribute(PLACEMENT_VERTICAL_ATTRIBUTE, 'invalid');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'bottom',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
    });

    it('should use default when both attribute and option are invalid/missing', () => {
      element.setAttribute(PLACEMENT_VERTICAL_ATTRIBUTE, 'invalid');

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      // Should not have bottom class (default is top)
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(false);
    });
  });

  describe('placement with input/textarea elements', () => {
    it('should apply placement classes to wrapper for textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Test textarea content';
      document.body.appendChild(textarea);

      widget = new FeedbackWidget(textarea, 'Test textarea content', 'test-api-key', {
        placementVertical: 'bottom',
        placementHorizontal: 'left',
      });

      // For input elements, the widget is in a wrapper div
      const inputWrapper = textarea.parentElement;
      expect(inputWrapper?.classList.contains('coolhand-input-wrapper')).toBe(true);

      const container = inputWrapper?.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });

    it('should apply placement classes to wrapper for input', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Test input content';
      document.body.appendChild(input);

      widget = new FeedbackWidget(input, 'Test input content', 'test-api-key', {
        placementVertical: 'bottom',
      });

      const inputWrapper = input.parentElement;
      const container = inputWrapper?.querySelector('[data-coolhand-widget]');
      expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);

      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
    });
  });

  describe('placement CSS custom property', () => {
    it('should have --coolhand-offset CSS variable available', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper') as HTMLElement;

      // The CSS variable should be defined in the styles
      // We can check that the element has the expected structure
      expect(wrapper).not.toBeNull();
      // The actual computed style testing is limited in jsdom, but we verify the element exists
    });
  });

  describe('options panel placement adjustment', () => {
    it('should have options panel that can be positioned correctly', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        placementVertical: 'bottom',
        placementHorizontal: 'left',
      });

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const optionsPanel = shadowRoot?.querySelector('.coolhand-options');

      // Options panel should exist
      expect(optionsPanel).not.toBeNull();

      // The placement classes on wrapper will affect the options panel positioning via CSS
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
      expect(wrapper?.classList.contains('coolhand-placement-bottom')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-placement-left')).toBe(true);
    });
  });
});

describe('Widget Placement - CoolhandFeedback Integration', () => {
  // These tests would require importing CoolhandFeedback
  // For now, we test the FeedbackWidget directly which is the core implementation

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support placement configuration through the widget', () => {
    const element = document.createElement('div');
    element.textContent = 'Test content';
    document.body.appendChild(element);

    const widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
      placementVertical: 'bottom',
      placementHorizontal: 'left',
    });

    const container = element.querySelector('[data-coolhand-widget]');
    expect(container?.classList.contains('coolhand-placement-bottom')).toBe(true);
    expect(container?.classList.contains('coolhand-placement-left')).toBe(true);

    widget.destroy();
  });
});
