/**
 * Accessibility tests using jest-axe
 *
 * Note: Automated accessibility testing catches ~30-50% of issues.
 * Manual testing with screen readers is still required for full compliance.
 */
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { createRequire } from 'module';
import CoolhandJS from '../src/index';

// Import axe for accessibility testing using createRequire for ESM compatibility
const require = createRequire(import.meta.url);
const { axe, toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

/**
 * Helper to get elements from Shadow DOM
 */
function getShadowRoot(): ShadowRoot | null {
  const container = document.querySelector('[data-coolhand-widget]');
  return container?.shadowRoot || null;
}

describe('Accessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset any previous initialization
    (CoolhandJS as unknown as { instance: null }).instance = null;
    jest.clearAllMocks();
    // Mock fetch
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
    jest.restoreAllMocks();
  });

  describe('FeedbackWidget', () => {
    it('should have no accessibility violations in initial state', async () => {
      document.body.innerHTML = `
        <main>
          <div coolhand-feedback>
            This is some AI-generated content that needs feedback.
          </div>
        </main>
      `;

      CoolhandJS.init('test-api-key');

      // Wait for widget to render
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Configure axe to disable region rule (page structure, not widget concern)
      const results = await axe(document.body, {
        rules: {
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when feedback panel is expanded', async () => {
      document.body.innerHTML = `
        <main>
          <div coolhand-feedback>
            This is some AI-generated content that needs feedback.
          </div>
        </main>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Click to expand options
      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      trigger?.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const results = await axe(document.body, {
        rules: {
          region: { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes on trigger button', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector('.coolhand-trigger');
      expect(trigger?.getAttribute('aria-label')).toBe('Provide feedback');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.hasAttribute('aria-controls')).toBe(true);
    });

    it('should update aria-expanded when options panel opens', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');

      trigger?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have proper role="radiogroup" on options', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expand options
      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      trigger?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const radiogroup = shadowRoot?.querySelector('[role="radiogroup"]');
      expect(radiogroup).not.toBeNull();
    });

    it('should have role="radio" and aria-checked on feedback buttons', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expand options
      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      trigger?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const buttons = shadowRoot?.querySelectorAll('.coolhand-option');
      buttons?.forEach((btn) => {
        expect(btn.getAttribute('role')).toBe('radio');
        expect(btn.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('should update aria-checked when option is selected', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expand options
      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      trigger?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Click thumbs up
      const thumbsUp = shadowRoot?.querySelector(
        '[data-feedback="up"]'
      ) as HTMLElement;
      thumbsUp?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(thumbsUp?.getAttribute('aria-checked')).toBe('true');
    });

    it('should have aria-live region for announcements', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const shadowRoot = getShadowRoot();
      const liveRegion = shadowRoot?.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });

    it('should have aria-hidden on decorative SVGs', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expand options to see all SVGs
      const shadowRoot = getShadowRoot();
      const trigger = shadowRoot?.querySelector(
        '.coolhand-trigger'
      ) as HTMLElement;
      trigger?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const svgs = shadowRoot?.querySelectorAll('svg');
      svgs?.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });

    it('should have focus visible styles in Shadow DOM', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the style element inside shadow DOM
      const shadowRoot = getShadowRoot();
      const styleElement = shadowRoot?.querySelector('style');
      const styles = styleElement?.textContent || '';

      expect(styles).toContain(':focus-visible');
      expect(styles).toContain('outline');
    });

    it('should have reduced motion media query in Shadow DOM', async () => {
      document.body.innerHTML = `
        <div coolhand-feedback>Test content</div>
      `;

      CoolhandJS.init('test-api-key');
      await new Promise((resolve) => setTimeout(resolve, 50));

      const shadowRoot = getShadowRoot();
      const styleElement = shadowRoot?.querySelector('style');
      const styles = styleElement?.textContent || '';

      expect(styles).toContain('prefers-reduced-motion');
    });
  });
});
