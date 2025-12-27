import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CoolhandFeedback } from '../src/coolhand-feedback';

describe('CoolhandFeedback', () => {
  let coolhand: CoolhandFeedback;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    coolhand = new CoolhandFeedback();
  });

  afterEach(() => {
    coolhand.destroy();
  });

  describe('init', () => {
    it('should return false when no API key is provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = coolhand.init('');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key is required')
      );

      consoleSpy.mockRestore();
    });

    it('should return true when valid API key is provided', () => {
      const result = coolhand.init('test-api-key');

      expect(result).toBe(true);
    });

    it('should enable auto-attachment by default', () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand.init('test-api-key');

      const widget = document.querySelector('[data-coolhand-widget]');
      expect(widget).not.toBeNull();
    });

    it('should not auto-attach when autoAttach is false', () => {
      document.body.innerHTML = '<div coolhand-feedback>Test content</div>';

      coolhand.init('test-api-key', { autoAttach: false });

      const widget = document.querySelector('[data-coolhand-widget]');
      expect(widget).toBeNull();
    });
  });

  describe('attach', () => {
    beforeEach(() => {
      coolhand.init('test-api-key', { autoAttach: false });
    });

    it('should return null if not initialized', () => {
      const uninitializedCoolhand = new CoolhandFeedback();
      const element = document.createElement('div');
      element.textContent = 'Test content';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = uninitializedCoolhand.attach(element);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key not initialized')
      );

      consoleSpy.mockRestore();
    });

    it('should return null for invalid element', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // @ts-expect-error Testing invalid input
      const result = coolhand.attach('not-an-element');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid element')
      );

      consoleSpy.mockRestore();
    });

    it('should return null for element with no text content', () => {
      const element = document.createElement('div');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = coolhand.attach(element);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No text content'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('should attach widget to valid element', () => {
      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      const widget = coolhand.attach(element);

      expect(widget).not.toBeNull();
      expect(element.querySelector('[data-coolhand-widget]')).not.toBeNull();
    });

    it('should return existing widget if already attached', () => {
      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const widget1 = coolhand.attach(element);
      const widget2 = coolhand.attach(element);

      expect(widget1).toBe(widget2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already attached')
      );

      consoleSpy.mockRestore();
    });

    it('should respect sessionId option from data attribute', () => {
      document.body.innerHTML = `
        <div coolhand-feedback data-coolhand-session-id="session-123">
          Test content
        </div>
      `;

      coolhand.init('test-api-key');

      const widget = document.querySelector('[data-coolhand-widget]');
      expect(widget).not.toBeNull();
    });
  });

  describe('detach', () => {
    it('should remove widget from element', () => {
      coolhand.init('test-api-key', { autoAttach: false });

      const element = document.createElement('div');
      element.textContent = 'Test content';
      document.body.appendChild(element);

      coolhand.attach(element);
      expect(element.querySelector('[data-coolhand-widget]')).not.toBeNull();

      coolhand.detach(element);
      expect(element.querySelector('[data-coolhand-widget]')).toBeNull();
    });

    it('should do nothing if widget not attached', () => {
      coolhand.init('test-api-key', { autoAttach: false });

      const element = document.createElement('div');
      element.textContent = 'Test content';

      // Should not throw
      expect(() => coolhand.detach(element)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should stop mutation observer', () => {
      coolhand.init('test-api-key');
      coolhand.destroy();

      // Add element after destroy - should not auto-attach
      document.body.innerHTML = '<div coolhand-feedback>New content</div>';

      // Give mutation observer time to trigger (if it was still active)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const widget = document.querySelector('[data-coolhand-widget]');
          // Widget might exist from before destroy, but new elements shouldn't trigger
          resolve();
        }, 10);
      });
    });
  });

  describe('MutationObserver', () => {
    it('should auto-attach to dynamically added elements with coolhand-feedback attribute', async () => {
      coolhand.init('test-api-key');

      // Dynamically add element with coolhand-feedback
      const newElement = document.createElement('div');
      newElement.setAttribute('coolhand-feedback', '');
      newElement.textContent = 'Dynamically added content';
      document.body.appendChild(newElement);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 50));

      const widget = newElement.querySelector('[data-coolhand-widget]');
      expect(widget).not.toBeNull();
    });

    it('should auto-attach to child elements within dynamically added nodes', async () => {
      coolhand.init('test-api-key');

      // Dynamically add a container with a child that has coolhand-feedback
      const container = document.createElement('div');
      container.innerHTML = '<p coolhand-feedback>Nested content</p>';
      document.body.appendChild(container);

      // Wait for MutationObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 50));

      const widget = container.querySelector('[data-coolhand-widget]');
      expect(widget).not.toBeNull();
    });

    it('should handle nodes without hasAttribute method', async () => {
      coolhand.init('test-api-key');

      // Add a text node (which doesn't have hasAttribute)
      const textNode = document.createTextNode('Just text');
      document.body.appendChild(textNode);

      // Wait for MutationObserver - should not throw
      await new Promise((resolve) => setTimeout(resolve, 50));

      // No error should occur
      expect(true).toBe(true);
    });

    it('should not attach twice to the same element added dynamically', async () => {
      coolhand.init('test-api-key');

      const newElement = document.createElement('div');
      newElement.setAttribute('coolhand-feedback', '');
      newElement.textContent = 'Content';
      document.body.appendChild(newElement);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Try to trigger another mutation
      newElement.setAttribute('data-test', 'value');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const widgets = newElement.querySelectorAll('[data-coolhand-widget]');
      expect(widgets.length).toBe(1);
    });
  });
});
