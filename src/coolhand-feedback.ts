import { FeedbackWidget } from './feedback-widget';
import type { InitOptions, AttachOptions } from './types';

/**
 * CoolhandFeedback manages the overall feedback system
 * Handles initialization, auto-attachment, and widget lifecycle
 */
export class CoolhandFeedback {
  private apiKey: string | null = null;
  private clientUniqueId: string | null = null;
  private instances: WeakMap<HTMLElement, FeedbackWidget> = new WeakMap();
  private observer: MutationObserver | null = null;
  private isAutoAttaching: boolean = false;

  /**
   * Initialize the feedback system with an API key
   * @param apiKey - Your Coolhand API key
   * @param options - Configuration options
   * @returns true if initialization succeeded, false otherwise
   */
  public init(apiKey: string, options: InitOptions = {}): boolean {
    if (!apiKey) {
      console.error(
        '[CoolhandJS] Error: API key is required. Call CoolhandJS.init("your-api-key") first.'
      );
      return false;
    }
    this.apiKey = apiKey;

    // Store global client unique ID if provided
    if (options.clientUniqueId) {
      this.clientUniqueId = options.clientUniqueId;
    }

    // Auto-attach to existing elements if enabled
    if (options.autoAttach !== false) {
      this.enableAutoAttachment();
    }

    return true;
  }

  /**
   * Enable automatic attachment to elements with coolhand-feedback attribute
   */
  private enableAutoAttachment(): void {
    if (this.isAutoAttaching) return;
    this.isAutoAttaching = true;

    // Attach to existing elements
    this.attachToExistingElements();

    // Set up mutation observer for dynamically added elements
    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((mutation: MutationRecord) => {
        mutation.addedNodes.forEach((node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.attachToElementsInNode(node as HTMLElement);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log(
      '[CoolhandJS] Auto-attachment enabled for elements with coolhand-feedback attribute'
    );
  }

  /**
   * Attach to all existing elements with the coolhand-feedback attribute
   */
  private attachToExistingElements(): void {
    const elements = document.querySelectorAll<HTMLElement>(
      '[coolhand-feedback="true"], [coolhand-feedback=""], [coolhand-feedback]'
    );
    elements.forEach((element) => this.autoAttachToElement(element));
  }

  /**
   * Attach to elements within a node (for mutation observer)
   */
  private attachToElementsInNode(node: HTMLElement): void {
    // Check the node itself
    if (node.hasAttribute && node.hasAttribute('coolhand-feedback')) {
      this.autoAttachToElement(node);
    }

    // Check child nodes
    if (node.querySelectorAll) {
      const elements = node.querySelectorAll<HTMLElement>(
        '[coolhand-feedback="true"], [coolhand-feedback=""], [coolhand-feedback]'
      );
      elements.forEach((element) => this.autoAttachToElement(element));
    }
  }

  /**
   * Auto-attach to an element, parsing options from data attributes
   */
  private autoAttachToElement(element: HTMLElement): void {
    if (this.instances.has(element)) return; // Already attached

    const options: AttachOptions = {};

    // Apply global clientUniqueId
    if (this.clientUniqueId) {
      options.clientUniqueId = this.clientUniqueId;
    }

    if (element.dataset.coolhandWorkloadId) {
      options.workloadId = element.dataset.coolhandWorkloadId;
    }

    if (element.dataset.coolhandWorkloadId) {
      options.workloadId = element.dataset.coolhandWorkloadId;
    }

    this.attach(element, options);
  }

  /**
   * Manually attach a feedback widget to an element
   * @param element - The HTML element to attach to
   * @param options - Configuration options for this widget
   * @returns The FeedbackWidget instance, or null on error
   */
  public attach(
    element: HTMLElement,
    options: AttachOptions = {}
  ): FeedbackWidget | null {
    if (!this.apiKey) {
      console.error(
        '[CoolhandJS] Error: API key not initialized. Call CoolhandJS.init("your-api-key") first.'
      );
      return null;
    }

    if (!(element instanceof HTMLElement)) {
      console.error(
        '[CoolhandJS] Error: Invalid element provided. Must be an HTMLElement.'
      );
      return null;
    }

    const textContent = this.extractText(element);
    if (!textContent) {
      console.error(
        '[CoolhandJS] Error: No text content found in element:',
        element
      );
      return null;
    }

    if (this.instances.has(element)) {
      console.warn(
        '[CoolhandJS] Warning: Feedback widget already attached to this element.'
      );
      return this.instances.get(element) || null;
    }

    // Apply global clientUniqueId as default if not provided in options
    const mergedOptions = { ...options };
    if (!mergedOptions.clientUniqueId && this.clientUniqueId) {
      mergedOptions.clientUniqueId = this.clientUniqueId;
    }

    const instance = new FeedbackWidget(
      element,
      textContent,
      this.apiKey,
      mergedOptions
    );
    this.instances.set(element, instance);
    return instance;
  }

  /**
   * Extract text content from an element
   * For input/textarea elements, extracts the value
   * For other elements, extracts textContent
   */
  private extractText(element: HTMLElement): string {
    // Handle input/textarea elements - extract value
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return element.value.trim();
    }

    // For other elements, extract text content
    const text = element.textContent || element.innerText || '';
    return text.trim();
  }

  /**
   * Detach a feedback widget from an element
   * @param element - The element to detach from
   */
  public detach(element: HTMLElement): void {
    const instance = this.instances.get(element);
    if (instance) {
      instance.destroy();
      this.instances.delete(element);
    }
  }

  /**
   * Destroy the feedback system and clean up
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isAutoAttaching = false;
  }
}
