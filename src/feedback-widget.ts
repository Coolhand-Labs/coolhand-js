import { widgetStyles } from './styles/widget.css';
import {
  triggerIcon,
  closeIcon,
  checkmarkIcon,
  thumbsUpIcon,
  thumbsDownIcon,
  neutralIcon,
} from './icons/icons';
import {
  COOLHAND_API_URL,
  VERSION,
  FEEDBACK_ID_ATTRIBUTE,
  ORIGINAL_OUTPUT_ATTRIBUTE,
  WIDGET_STYLE_ATTRIBUTE,
  DEBOUNCE_MS,
} from './constants';
import type {
  FeedbackValue,
  FeedbackType,
  AttachOptions,
  FeedbackApiPayload,
  FeedbackApiResponse,
  WidgetStyle,
} from './types';
import { FEEDBACK_TYPE_TO_VALUE } from './types';

/** Map feedback type to its icon */
const FEEDBACK_TYPE_TO_ICON: Record<FeedbackType, string> = {
  down: thumbsDownIcon,
  neutral: neutralIcon,
  up: thumbsUpIcon,
};

/**
 * FeedbackWidget manages individual feedback UI components
 */
export class FeedbackWidget {
  private targetElement: HTMLElement;
  private originalText: string;
  private apiKey: string;
  private options: AttachOptions;
  private isExpanded: boolean = false;
  private selectedFeedback: FeedbackValue = null;
  private selectedType: FeedbackType | null = null;
  private useShadowDOM: boolean;
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private trigger: HTMLElement | null = null;
  private optionsPanel: HTMLElement | null = null;
  private selectedIconContainer: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;
  private feedbackButtons: NodeListOf<Element> | null = null;

  // Input/textarea monitoring
  private isInputElement: boolean = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private boundInputHandler: ((e: Event) => void) | null = null;
  private boundBlurHandler: ((e: Event) => void) | null = null;

  // Widget style ("overlay", "pixel", or "hidden")
  private widgetStyle: WidgetStyle = 'overlay';

  constructor(
    targetElement: HTMLElement,
    originalText: string,
    apiKey: string,
    options: AttachOptions = {}
  ) {
    this.targetElement = targetElement;
    this.originalText = originalText;
    this.apiKey = apiKey;
    this.options = options;
    this.useShadowDOM = this.supportsShadowDOM();

    // Determine widget style (priority: element attribute > options > default)
    const styleAttr = targetElement.getAttribute(WIDGET_STYLE_ATTRIBUTE) as WidgetStyle | null;
    if (styleAttr === 'pixel' || styleAttr === 'hidden') {
      this.widgetStyle = styleAttr;
    } else if (options.widgetStyle) {
      this.widgetStyle = options.widgetStyle;
    }

    // Detect if this is an input or textarea element
    this.isInputElement =
      targetElement instanceof HTMLInputElement ||
      targetElement instanceof HTMLTextAreaElement;

    // Only render widget UI if not hidden
    if (this.widgetStyle !== 'hidden') {
      this.init();
    }

    // Set up input monitoring for textarea/input elements (even if widget is hidden)
    if (this.isInputElement) {
      // Store original output in a data attribute
      this.targetElement.setAttribute(ORIGINAL_OUTPUT_ATTRIBUTE, this.originalText);
      this.setupInputMonitoring();
    }
  }

  /**
   * Check if Shadow DOM is supported
   */
  private supportsShadowDOM(): boolean {
    return !!document.head.attachShadow;
  }

  /**
   * Initialize the widget
   */
  private init(): void {
    this.targetElement.style.position = 'relative';

    const container = document.createElement('div');
    container.setAttribute('data-coolhand-widget', 'true');
    container.className = 'coolhand-feedback-container';

    if (this.useShadowDOM) {
      this.shadowRoot = container.attachShadow({ mode: 'open' });
      this.render(this.shadowRoot);
    } else {
      this.render(container);
    }

    this.targetElement.appendChild(container);
    this.container = container;
  }

  /**
   * Render the widget HTML and attach events
   */
  private render(root: ShadowRoot | HTMLElement): void {
    const uniqueId = `coolhand-${Math.random().toString(36).substr(2, 9)}`;
    const optionsPanelId = `${uniqueId}-options`;
    const pixelModeClass = this.widgetStyle === 'pixel' ? ' coolhand-pixel-mode' : '';

    const html = `
      ${this.useShadowDOM ? '' : widgetStyles}
      <div class="coolhand-feedback-wrapper${pixelModeClass}" role="region" aria-label="Feedback">
        <div class="coolhand-sr-only" aria-live="polite" aria-atomic="true"></div>
        <button
          class="coolhand-trigger"
          aria-label="Provide feedback"
          aria-expanded="false"
          aria-controls="${optionsPanelId}">
          <span class="coolhand-trigger-icon" aria-hidden="true">${triggerIcon}</span>
          <span aria-hidden="true">${checkmarkIcon}</span>
          <span class="coolhand-selected-icon" aria-hidden="true"></span>
        </button>
        <div
          id="${optionsPanelId}"
          class="coolhand-options"
          role="group"
          aria-label="Rate this content"
          aria-hidden="true">
          <div class="coolhand-prompt" id="${uniqueId}-prompt">Was this useful?</div>
          <div class="coolhand-options-row" role="radiogroup" aria-labelledby="${uniqueId}-prompt">
            <button class="coolhand-option" data-feedback="down" aria-label="Not useful" role="radio" aria-checked="false">
              <span aria-hidden="true">${thumbsDownIcon}</span>
            </button>
            <button class="coolhand-option" data-feedback="neutral" aria-label="Somewhat useful" role="radio" aria-checked="false">
              <span aria-hidden="true">${neutralIcon}</span>
            </button>
            <button class="coolhand-option" data-feedback="up" aria-label="Very useful" role="radio" aria-checked="false">
              <span aria-hidden="true">${thumbsUpIcon}</span>
            </button>
            <button class="coolhand-close" aria-label="Close feedback options">
              <span aria-hidden="true">${closeIcon}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    if (this.useShadowDOM) {
      root.innerHTML = widgetStyles + html;
    } else {
      root.innerHTML = html;
    }

    this.attachEvents(root);
  }

  /**
   * Attach event listeners to widget elements
   */
  private attachEvents(root: ShadowRoot | HTMLElement): void {
    this.trigger = root.querySelector('.coolhand-trigger');
    this.optionsPanel = root.querySelector('.coolhand-options');
    this.selectedIconContainer = root.querySelector('.coolhand-selected-icon');
    this.statusRegion = root.querySelector('.coolhand-sr-only');
    const closeBtn = root.querySelector('.coolhand-close');
    this.feedbackButtons = root.querySelectorAll('.coolhand-option');

    if (!this.trigger || !this.optionsPanel || !closeBtn) {
      console.error('[CoolhandJS] Error: Could not find required widget elements');
      return;
    }

    this.trigger.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.toggleOptions();
    });

    closeBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.hideOptions();
    });

    this.feedbackButtons.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleFeedback(btn as HTMLElement, this.feedbackButtons!);
      });
    });

    // Keyboard navigation for trigger
    this.trigger.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isExpanded) {
        e.preventDefault();
        this.hideOptions();
      }
    });

    // Keyboard navigation for options panel
    this.optionsPanel.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyboardNavigation(e);
    });

    document.addEventListener('click', (e: Event) => {
      if (!root.contains(e.target as Node)) {
        this.hideOptions();
      }
    });

    // Global escape key handler
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isExpanded) {
        this.hideOptions();
      }
    });
  }

  /**
   * Handle keyboard navigation within the options panel
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    if (!this.feedbackButtons) return;

    const buttons = Array.from(this.feedbackButtons) as HTMLElement[];
    // In Shadow DOM, document.activeElement returns the host, so use shadowRoot.activeElement
    const activeElement = this.shadowRoot?.activeElement ?? document.activeElement;
    const currentIndex = buttons.findIndex((btn) => btn === activeElement);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        buttons[nextIndex].focus();
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        buttons[prevIndex].focus();
        break;
      }
      case 'Escape':
        e.preventDefault();
        this.hideOptions();
        if (this.trigger) this.trigger.focus();
        break;
    }
  }

  /**
   * Toggle the options panel visibility
   */
  private toggleOptions(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      if (this.trigger) {
        this.trigger.style.display = 'none';
        this.trigger.setAttribute('aria-expanded', 'true');
      }
      if (this.optionsPanel) {
        this.optionsPanel.classList.add('expanded');
        this.optionsPanel.setAttribute('aria-hidden', 'false');
        // Focus first option for keyboard users
        const firstOption = this.optionsPanel.querySelector('.coolhand-option') as HTMLElement;
        if (firstOption) firstOption.focus();
      }
    } else {
      this.hideOptions();
    }
  }

  /**
   * Hide the options panel
   */
  private hideOptions(): void {
    this.isExpanded = false;
    if (this.trigger) {
      this.trigger.style.display = 'flex';
      this.trigger.setAttribute('aria-expanded', 'false');
    }
    if (this.optionsPanel) {
      this.optionsPanel.classList.remove('expanded');
      this.optionsPanel.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Announce a message to screen readers via aria-live region
   */
  private announce(message: string): void {
    if (this.statusRegion) {
      this.statusRegion.textContent = message;
      // Clear after announcement to allow repeat announcements
      setTimeout(() => {
        if (this.statusRegion) this.statusRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Handle feedback selection
   */
  private handleFeedback(
    selectedBtn: HTMLElement,
    allBtns: NodeListOf<Element>
  ): void {
    // Update visual and ARIA states
    allBtns.forEach((btn) => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    selectedBtn.classList.add('selected');
    selectedBtn.setAttribute('aria-checked', 'true');

    const feedbackType = selectedBtn.dataset.feedback as FeedbackType | undefined;

    if (!feedbackType) {
      console.error('[CoolhandJS] Error: Invalid feedback type');
      return;
    }

    const feedbackValue = FEEDBACK_TYPE_TO_VALUE[feedbackType];

    this.selectedFeedback = feedbackValue;
    this.selectedType = feedbackType;

    // Immediately update the trigger to show the selected feedback icon
    if (this.trigger && this.selectedIconContainer) {
      this.selectedIconContainer.innerHTML = FEEDBACK_TYPE_TO_ICON[feedbackType];
      this.trigger.setAttribute('data-selected', feedbackType);
      this.trigger.classList.add('has-feedback');
    }

    // First blur any focused element in shadow DOM to release focus
    const activeEl = this.shadowRoot?.activeElement as HTMLElement | null;
    if (activeEl && activeEl.blur) {
      activeEl.blur();
    }

    // Now hide the options panel (safe since nothing inside has focus)
    this.hideOptions();

    // Move focus to trigger for keyboard users
    if (this.trigger) {
      this.trigger.focus();
    }

    // Send feedback to the server
    this.sendFeedback(feedbackValue);
  }

  /**
   * Send feedback to the API (creates new or updates existing)
   */
  private async sendFeedback(feedbackValue: FeedbackValue): Promise<void> {
    const existingFeedbackId = this.targetElement.getAttribute(FEEDBACK_ID_ATTRIBUTE);
    const isUpdate = !!existingFeedbackId;

    const payload: FeedbackApiPayload = {
      llm_request_log_feedback: {
        like: feedbackValue,
        original_output: this.originalText,
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.clientUniqueId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.clientUniqueId;
    }

    if (this.options.workloadId) {
      payload.llm_request_log_feedback.workload_hashid = this.options.workloadId;
    }

    // Determine URL and method based on whether we're updating or creating
    const url = isUpdate
      ? `${COOLHAND_API_URL}/${existingFeedbackId}`
      : COOLHAND_API_URL;
    const method = isUpdate ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedbackApiResponse = await response.json();
      const action = isUpdate ? 'updated' : 'submitted';
      console.log(`[CoolhandJS] Feedback ${action} successfully:`, data);

      // Store feedback ID on the target element for reference (for new feedback)
      if (data.id && !isUpdate) {
        this.targetElement.setAttribute(FEEDBACK_ID_ATTRIBUTE, String(data.id));
      }

      // Announce success to screen readers
      this.announce('Feedback submitted successfully');

      // Show checkmark briefly to indicate success, then revert to selected icon
      if (this.trigger) {
        this.trigger.classList.add('showing-checkmark');
        setTimeout(() => {
          if (this.trigger) {
            this.trigger.classList.remove('showing-checkmark');
          }
        }, 800);
      }

      if (this.options.onSuccess) {
        this.options.onSuccess(feedbackValue, data);
      }
    } catch (error) {
      const err = error as Error;
      console.error('[CoolhandJS] Error submitting feedback:', err);

      // Announce error to screen readers
      this.announce('Error submitting feedback. Please try again.');

      if (err.message.includes('CORS')) {
        console.error(
          '[CoolhandJS] CORS error detected. Ensure your domain is whitelisted in the Coolhand dashboard.'
        );
      }

      if (this.options.onError) {
        this.options.onError(err);
      }
    }
  }

  /**
   * Set up monitoring for input/textarea value changes
   */
  private setupInputMonitoring(): void {
    // Bind handlers so we can remove them later
    this.boundInputHandler = this.handleInputChange.bind(this);
    this.boundBlurHandler = this.handleInputBlur.bind(this);

    // Listen for input events (fires on every keystroke)
    this.targetElement.addEventListener('input', this.boundInputHandler);

    // Also listen for blur to catch paste events and final changes
    this.targetElement.addEventListener('blur', this.boundBlurHandler);
  }

  /**
   * Handle input changes with debouncing
   */
  private handleInputChange(): void {
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.sendRevisedOutput();
    }, DEBOUNCE_MS);
  }

  /**
   * Handle blur event - send immediately without debounce
   */
  private handleInputBlur(): void {
    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Send immediately
    this.sendRevisedOutput();
  }

  /**
   * Send revised output to the API
   */
  private async sendRevisedOutput(): Promise<void> {
    // Only send if element is input/textarea
    if (!this.isInputElement) return;

    const element = this.targetElement as HTMLInputElement | HTMLTextAreaElement;
    const currentValue = element.value.trim();
    const originalOutput = this.targetElement.getAttribute(ORIGINAL_OUTPUT_ATTRIBUTE) || this.originalText;

    // Don't send if content hasn't changed from original
    if (currentValue === originalOutput) return;

    // Check if we have an existing feedback ID
    const existingFeedbackId = this.targetElement.getAttribute(FEEDBACK_ID_ATTRIBUTE);

    const payload: FeedbackApiPayload = {
      llm_request_log_feedback: {
        like: this.selectedFeedback,
        original_output: originalOutput,
        revised_output: currentValue,
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.clientUniqueId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.clientUniqueId;
    }

    if (this.options.workloadId) {
      payload.llm_request_log_feedback.workload_hashid = this.options.workloadId;
    }

    // Use PATCH if we have an existing ID, POST otherwise
    const url = existingFeedbackId
      ? `${COOLHAND_API_URL}/${existingFeedbackId}`
      : COOLHAND_API_URL;
    const method = existingFeedbackId ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedbackApiResponse = await response.json();
      const action = existingFeedbackId ? 'updated' : 'created';
      console.log(`[CoolhandJS] Revised output ${action} successfully:`, data);

      // Store feedback ID if this was a new creation
      if (data.id && !existingFeedbackId) {
        this.targetElement.setAttribute(FEEDBACK_ID_ATTRIBUTE, String(data.id));
      }

      if (this.options.onRevisedOutput) {
        this.options.onRevisedOutput(currentValue, data);
      }
    } catch (error) {
      const err = error as Error;
      console.error('[CoolhandJS] Error sending revised output:', err);

      if (this.options.onError) {
        this.options.onError(err);
      }
    }
  }

  /**
   * Remove the widget from the DOM and clean up event listeners
   */
  public destroy(): void {
    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Remove input monitoring event listeners
    if (this.boundInputHandler) {
      this.targetElement.removeEventListener('input', this.boundInputHandler);
      this.boundInputHandler = null;
    }
    if (this.boundBlurHandler) {
      this.targetElement.removeEventListener('blur', this.boundBlurHandler);
      this.boundBlurHandler = null;
    }

    // Remove the widget container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
