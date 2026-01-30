import { FeedbackWidget } from './feedback-widget';
import { PartialFeedbackManager } from './partial-feedback-manager';
import { getOrCreateFingerprintId, hasFeedbackBeenViewed, markFeedbackAsViewed } from './cookie';
import { PARTIAL_FEEDBACK_ATTRIBUTE } from './constants';
import type { InitOptions, AttachOptions, WidgetStyle, ColorScheme, WidgetPlacementVertical, WidgetPlacementHorizontal, PartialFeedbackOptions } from './types';

/**
 * CoolhandFeedback manages the overall feedback system
 * Handles initialization, auto-attachment, and widget lifecycle
 */
export class CoolhandFeedback {
  private apiKey: string | null = null;
  private clientUniqueId: string | null = null;
  private widgetStyle: WidgetStyle | null = null;
  private colorScheme: ColorScheme = 'light';
  private explanationSample: number | null = null;
  private fingerprintId: string | null = null;
  private autoHighlight: boolean = false;
  private placementVertical: WidgetPlacementVertical | null = null;
  private placementHorizontal: WidgetPlacementHorizontal | null = null;
  private partialFeedbackOptions: PartialFeedbackOptions | null = null;
  private instances: WeakMap<HTMLElement, FeedbackWidget> = new WeakMap();
  private partialManagers: WeakMap<HTMLElement, PartialFeedbackManager> = new WeakMap();
  private attachedElements: Set<HTMLElement> = new Set();
  private partialFeedbackElements: Set<HTMLElement> = new Set();
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

    // If re-initializing, destroy existing widgets first
    const isReinitializing = this.apiKey !== null;
    if (isReinitializing) {
      this.destroyAllWidgets();
      // Reset auto-attach state so enableAutoAttachment will run again
      this.isAutoAttaching = false;
    }

    this.apiKey = apiKey;

    // Store global client unique ID if provided
    if (options.clientUniqueId) {
      this.clientUniqueId = options.clientUniqueId;
    }

    // Store global widget style if provided
    this.widgetStyle = options.widgetStyle || null;

    // Store global color scheme (default to 'light')
    this.colorScheme = options.colorScheme || 'light';

    // Store global explanation sample rate if provided
    this.explanationSample = typeof options.explanationSample === 'number'
      ? Math.max(0, Math.min(1, options.explanationSample))
      : null;

    // Store global placement settings if provided
    this.placementVertical = options.placementVertical || null;
    this.placementHorizontal = options.placementHorizontal || null;

    // Store global partial feedback options if provided
    this.partialFeedbackOptions = options.partialFeedbackOptions || null;

    // Initialize fingerprint ID from cookie (unless explicitly disabled)
    if (options.enableFingerprint !== false) {
      this.fingerprintId = getOrCreateFingerprintId();
    } else {
      this.fingerprintId = null;
    }

    // Initialize auto-highlight (unless explicitly disabled)
    // Auto-highlight shows on all widgets until user interacts with any widget
    if (options.autoHighlight !== false) {
      // Only enable auto-highlight if feedback hasn't been viewed yet
      this.autoHighlight = !hasFeedbackBeenViewed();
    } else {
      this.autoHighlight = false;
    }

    // Auto-attach to existing elements if enabled
    if (options.autoAttach !== false) {
      this.enableAutoAttachment();
    }

    return true;
  }

  /**
   * Destroy all existing widgets (used when re-initializing)
   */
  private destroyAllWidgets(): void {
    const elements = document.querySelectorAll<HTMLElement>(
      '[coolhand-feedback="true"], [coolhand-feedback=""], [coolhand-feedback]'
    );
    elements.forEach((element) => {
      this.detach(element);
    });
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

    // Apply global widgetStyle
    if (this.widgetStyle) {
      options.widgetStyle = this.widgetStyle;
    }

    // Apply global colorScheme
    options.colorScheme = this.colorScheme;

    // Apply global explanationSample
    if (this.explanationSample !== null) {
      options.explanationSample = this.explanationSample;
    }

    // Apply global fingerprintId
    if (this.fingerprintId) {
      options.coolhandFingerprintId = this.fingerprintId;
    }

    // Apply global autoHighlight
    if (this.autoHighlight) {
      options.autoHighlight = true;
      options.onFirstInteraction = (): void => this.handleFirstInteraction();
    }

    // Apply global placement settings
    if (this.placementVertical) {
      options.placementVertical = this.placementVertical;
    }
    if (this.placementHorizontal) {
      options.placementHorizontal = this.placementHorizontal;
    }

    if (element.dataset.coolhandWorkloadId) {
      options.workloadId = element.dataset.coolhandWorkloadId;
    }

    this.attach(element, options);

    // Check if element also supports partial feedback
    if (element.hasAttribute(PARTIAL_FEEDBACK_ATTRIBUTE)) {
      this.attachPartialFeedbackToElement(element);
    }
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

    // Apply global defaults if not provided in options
    const mergedOptions = { ...options };
    if (!mergedOptions.clientUniqueId && this.clientUniqueId) {
      mergedOptions.clientUniqueId = this.clientUniqueId;
    }
    if (!mergedOptions.widgetStyle && this.widgetStyle) {
      mergedOptions.widgetStyle = this.widgetStyle;
    }
    if (!mergedOptions.colorScheme) {
      mergedOptions.colorScheme = this.colorScheme;
    }
    if (mergedOptions.explanationSample === undefined && this.explanationSample !== null) {
      mergedOptions.explanationSample = this.explanationSample;
    }
    if (!mergedOptions.coolhandFingerprintId && this.fingerprintId) {
      mergedOptions.coolhandFingerprintId = this.fingerprintId;
    }

    // Apply auto-highlight if enabled and not already set
    if (mergedOptions.autoHighlight === undefined && this.autoHighlight) {
      mergedOptions.autoHighlight = true;
      mergedOptions.onFirstInteraction = (): void => this.handleFirstInteraction();
    }

    // Apply global placement settings if not provided
    if (!mergedOptions.placementVertical && this.placementVertical) {
      mergedOptions.placementVertical = this.placementVertical;
    }
    if (!mergedOptions.placementHorizontal && this.placementHorizontal) {
      mergedOptions.placementHorizontal = this.placementHorizontal;
    }

    const instance = new FeedbackWidget(
      element,
      textContent,
      this.apiKey,
      mergedOptions
    );
    this.instances.set(element, instance);
    this.attachedElements.add(element);
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
   * Attach partial feedback to an element internally
   */
  private attachPartialFeedbackToElement(element: HTMLElement): void {
    // Skip if already attached
    if (this.partialManagers.has(element)) return;

    // Skip input and textarea elements
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      console.warn(
        '[CoolhandJS] Partial feedback is not supported on input/textarea elements'
      );
      return;
    }

    // Build options
    const partialOptions: PartialFeedbackOptions = {
      ...this.partialFeedbackOptions,
    };

    // Apply global settings
    if (this.clientUniqueId && !partialOptions.clientUniqueId) {
      partialOptions.clientUniqueId = this.clientUniqueId;
    }
    if (this.fingerprintId && !partialOptions.coolhandFingerprintId) {
      partialOptions.coolhandFingerprintId = this.fingerprintId;
    }
    if (!partialOptions.colorScheme) {
      partialOptions.colorScheme = this.colorScheme;
    }

    // Get workload ID from element if present
    if (element.dataset.coolhandWorkloadId && !partialOptions.workloadId) {
      partialOptions.workloadId = element.dataset.coolhandWorkloadId;
    }

    const manager = new PartialFeedbackManager(
      element,
      this.apiKey!,
      partialOptions
    );
    this.partialManagers.set(element, manager);
    this.partialFeedbackElements.add(element);
  }

  /**
   * Manually attach partial feedback to an element
   * @param element - The element to attach partial feedback to
   * @param options - Configuration options for partial feedback
   * @returns The PartialFeedbackManager instance, or null on error
   */
  public attachPartialFeedback(
    element: HTMLElement,
    options: PartialFeedbackOptions = {}
  ): PartialFeedbackManager | null {
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

    // Skip input and textarea elements
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      console.error(
        '[CoolhandJS] Error: Partial feedback is not supported on input/textarea elements.'
      );
      return null;
    }

    if (this.partialManagers.has(element)) {
      console.warn(
        '[CoolhandJS] Warning: Partial feedback already attached to this element.'
      );
      return this.partialManagers.get(element) || null;
    }

    // Merge with global options
    const mergedOptions: PartialFeedbackOptions = {
      ...this.partialFeedbackOptions,
      ...options,
    };

    // Apply global settings if not provided
    if (!mergedOptions.clientUniqueId && this.clientUniqueId) {
      mergedOptions.clientUniqueId = this.clientUniqueId;
    }
    if (!mergedOptions.coolhandFingerprintId && this.fingerprintId) {
      mergedOptions.coolhandFingerprintId = this.fingerprintId;
    }
    if (!mergedOptions.colorScheme) {
      mergedOptions.colorScheme = this.colorScheme;
    }

    const manager = new PartialFeedbackManager(
      element,
      this.apiKey,
      mergedOptions
    );
    this.partialManagers.set(element, manager);
    this.partialFeedbackElements.add(element);
    return manager;
  }

  /**
   * Detach partial feedback from an element
   * @param element - The element to detach partial feedback from
   */
  public detachPartialFeedback(element: HTMLElement): void {
    const manager = this.partialManagers.get(element);
    if (manager) {
      manager.destroy();
      this.partialManagers.delete(element);
      this.partialFeedbackElements.delete(element);
    }
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
      this.attachedElements.delete(element);
    }

    // Also detach partial feedback if attached
    this.detachPartialFeedback(element);
  }

  /**
   * Destroy the feedback system and clean up
   */
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Destroy all partial feedback managers
    this.partialFeedbackElements.forEach((element) => {
      const manager = this.partialManagers.get(element);
      if (manager) {
        manager.destroy();
      }
    });
    this.partialFeedbackElements.clear();

    this.attachedElements.clear();
    this.isAutoAttaching = false;
  }

  /**
   * Update the color scheme for all existing widgets
   * @param colorScheme - The new color scheme ('light', 'dark', or 'system')
   */
  public setColorScheme(colorScheme: ColorScheme): void {
    this.colorScheme = colorScheme;

    // Update all existing widget instances
    this.attachedElements.forEach((element) => {
      const instance = this.instances.get(element);
      if (instance) {
        instance.setColorScheme(colorScheme);
      }
    });

    console.log(`[CoolhandJS] Color scheme updated to: ${colorScheme}`);
  }

  /**
   * Handle first interaction with any feedback widget
   * Marks feedback as viewed in cookie and removes auto-highlights from all widgets
   * @internal
   */
  private handleFirstInteraction(): void {
    if (!this.autoHighlight) {
      return; // Already handled or not enabled
    }

    // Mark in cookie that feedback has been viewed
    markFeedbackAsViewed();

    // Disable auto-highlight for future widgets
    this.autoHighlight = false;

    // Remove auto-highlights from all existing widgets
    this.attachedElements.forEach((element) => {
      const instance = this.instances.get(element);
      if (instance) {
        instance.removeAutoHighlight();
      }
    });

    console.log('[CoolhandJS] First interaction detected, auto-highlights removed');
  }
}
