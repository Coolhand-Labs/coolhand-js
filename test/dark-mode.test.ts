import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FeedbackWidget } from '../src/feedback-widget';
import { CoolhandFeedback } from '../src/coolhand-feedback';
import CoolhandJS from '../src/index';
import { createRequire } from 'module';

// Import axe for accessibility testing
const require = createRequire(import.meta.url);
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

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

/**
 * Helper to mock window.matchMedia for testing system color scheme preference
 */
function mockMatchMedia(prefersDark: boolean): () => void {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  };
}

describe('Dark Mode', () => {
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

  describe('FeedbackWidget colorScheme option', () => {
    it('should default to light mode (no dark class)', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key');

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
    });

    it('should apply dark mode class when colorScheme is "dark"', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'dark',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });

    it('should not apply dark mode class when colorScheme is "light"', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'light',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
    });

    it('should respect system preference when colorScheme is "system" (dark mode)', () => {
      // Mock window.matchMedia to return dark mode preference
      const restoreMatchMedia = mockMatchMedia(true);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'system',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);

      restoreMatchMedia();
    });

    it('should respect system preference when colorScheme is "system" (light mode)', () => {
      // Mock window.matchMedia to return light mode preference
      const restoreMatchMedia = mockMatchMedia(false);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'system',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);

      restoreMatchMedia();
    });

    it('should default to light when system preference cannot be determined', () => {
      // Mock window.matchMedia to be undefined
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error Testing undefined matchMedia
      window.matchMedia = undefined;

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'system',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('FeedbackWidget.setColorScheme()', () => {
    it('should dynamically update to dark mode', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'light',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);

      widget.setColorScheme('dark');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });

    it('should dynamically update to light mode', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'dark',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);

      widget.setColorScheme('light');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
    });

    it('should dynamically update to system preference', () => {
      // Mock window.matchMedia to return dark mode preference
      const restoreMatchMedia = mockMatchMedia(true);

      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'light',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);

      widget.setColorScheme('system');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);

      restoreMatchMedia();
    });

    it('should remove dark class when switching from dark to light', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        colorScheme: 'dark',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      // Verify dark class is present
      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);

      // Switch to light
      widget.setColorScheme('light');

      // Verify dark class is removed
      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
    });
  });

  describe('Dark mode with pixel style', () => {
    it('should apply both pixel-mode and dark classes', () => {
      widget = new FeedbackWidget(element, 'Test content', 'test-api-key', {
        widgetStyle: 'pixel',
        colorScheme: 'dark',
      });

      const shadowRoot = getShadowRoot(element);
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-pixel-mode')).toBe(true);
      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });
  });
});

describe('CoolhandFeedback Dark Mode', () => {
  let coolhand: CoolhandFeedback;

  beforeEach(() => {
    document.body.innerHTML = '';
    coolhand = new CoolhandFeedback();
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
    coolhand.destroy();
  });

  describe('init with colorScheme', () => {
    it('should apply dark mode to auto-attached widgets', async () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand.init('test-api-key', { colorScheme: 'dark' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const container = document.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });

    it('should apply light mode to auto-attached widgets by default', async () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand.init('test-api-key');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const container = document.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
    });

    it('should apply colorScheme to manually attached widgets', () => {
      coolhand.init('test-api-key', { autoAttach: false, colorScheme: 'dark' });

      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      coolhand.attach(element);

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });
  });

  describe('setColorScheme()', () => {
    it('should update all existing widgets to dark mode', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Content 1</div>
        <div coolhand-feedback>Content 2</div>
      `;

      coolhand.init('test-api-key', { colorScheme: 'light' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify both are light mode initially
      const containers = document.querySelectorAll('[data-coolhand-widget]');
      containers.forEach((container) => {
        const shadowRoot = container.shadowRoot;
        const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
        expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
      });

      // Update to dark mode
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      coolhand.setColorScheme('dark');
      consoleSpy.mockRestore();

      // Verify both are now dark mode
      containers.forEach((container) => {
        const shadowRoot = container.shadowRoot;
        const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
        expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
      });
    });

    it('should update all existing widgets to light mode', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Content 1</div>
        <div coolhand-feedback>Content 2</div>
      `;

      coolhand.init('test-api-key', { colorScheme: 'dark' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify both are dark mode initially
      const containers = document.querySelectorAll('[data-coolhand-widget]');
      containers.forEach((container) => {
        const shadowRoot = container.shadowRoot;
        const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
        expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
      });

      // Update to light mode
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      coolhand.setColorScheme('light');
      consoleSpy.mockRestore();

      // Verify both are now light mode
      containers.forEach((container) => {
        const shadowRoot = container.shadowRoot;
        const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');
        expect(wrapper?.classList.contains('coolhand-dark')).toBe(false);
      });
    });

    it('should log color scheme change', async () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand.init('test-api-key');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      coolhand.setColorScheme('dark');

      expect(consoleSpy).toHaveBeenCalledWith('[CoolhandJS] Color scheme updated to: dark');

      consoleSpy.mockRestore();
    });

    it('should apply new colorScheme to subsequently attached widgets', async () => {
      coolhand.init('test-api-key', { autoAttach: false, colorScheme: 'light' });

      // Change to dark mode before attaching
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      coolhand.setColorScheme('dark');
      consoleSpy.mockRestore();

      // Now attach a widget
      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      coolhand.attach(element);

      const container = element.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });
  });

  describe('dynamically added elements', () => {
    it('should apply colorScheme to dynamically added elements via MutationObserver', async () => {
      coolhand.init('test-api-key', { colorScheme: 'dark' });

      // Dynamically add element
      const newElement = document.createElement('div');
      newElement.setAttribute('coolhand-feedback', '');
      newElement.textContent = 'Dynamically added content';
      document.body.appendChild(newElement);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 50));

      const container = newElement.querySelector('[data-coolhand-widget]');
      const shadowRoot = container?.shadowRoot;
      const wrapper = shadowRoot?.querySelector('.coolhand-feedback-wrapper');

      expect(wrapper?.classList.contains('coolhand-dark')).toBe(true);
    });
  });
});

describe('Dark Mode CSS', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset any previous initialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CoolhandJS as unknown as { instance: null }).instance = null;
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

  it('should include dark mode CSS variables in Shadow DOM', async () => {
    document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

    CoolhandJS.init('test-api-key', { colorScheme: 'dark' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const container = document.querySelector('[data-coolhand-widget]');
    const shadowRoot = container?.shadowRoot;
    const styleElement = shadowRoot?.querySelector('style');
    const styles = styleElement?.textContent || '';

    // Verify dark mode CSS variables are present
    expect(styles).toContain('.coolhand-dark');
    expect(styles).toContain('--coolhand-bg: #1f2937');
    expect(styles).toContain('--coolhand-text: #f3f4f6');
  });

  it('should include dark mode checkmark styles', async () => {
    document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

    CoolhandJS.init('test-api-key');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const container = document.querySelector('[data-coolhand-widget]');
    const shadowRoot = container?.shadowRoot;
    const styleElement = shadowRoot?.querySelector('style');
    const styles = styleElement?.textContent || '';

    // Verify dark mode checkmark state is styled
    expect(styles).toContain('.coolhand-dark .coolhand-trigger.showing-checkmark');
  });

  it('should include dark mode textarea focus styles', async () => {
    document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

    CoolhandJS.init('test-api-key');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const container = document.querySelector('[data-coolhand-widget]');
    const shadowRoot = container?.shadowRoot;
    const styleElement = shadowRoot?.querySelector('style');
    const styles = styleElement?.textContent || '';

    // Verify dark mode textarea focus is styled
    expect(styles).toContain('.coolhand-dark .coolhand-explanation-textarea:focus');
  });
});

describe('Dark Mode Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset any previous initialization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CoolhandJS as unknown as { instance: null }).instance = null;
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

  it('should have no accessibility violations in dark mode', async () => {
    document.body.innerHTML = `
      <main>
        <div coolhand-feedback>
          This is some AI-generated content that needs feedback.
        </div>
      </main>
    `;

    CoolhandJS.init('test-api-key', { colorScheme: 'dark' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const results = await axe(document.body, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in dark mode with expanded panel', async () => {
    document.body.innerHTML = `
      <main>
        <div coolhand-feedback>
          This is some AI-generated content that needs feedback.
        </div>
      </main>
    `;

    CoolhandJS.init('test-api-key', { colorScheme: 'dark' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Expand options
    const container = document.querySelector('[data-coolhand-widget]');
    const shadowRoot = container?.shadowRoot;
    const trigger = shadowRoot?.querySelector('.coolhand-trigger') as HTMLElement;
    trigger?.click();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const results = await axe(document.body, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
