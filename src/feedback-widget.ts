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
  HIGHLIGHT_ATTRIBUTE,
  EXPLANATION_ATTRIBUTE,
  EXPLANATION_PROMPT_ATTRIBUTE,
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
  private wrapper: HTMLElement | null = null;

  // Input/textarea monitoring
  private isInputElement: boolean = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private boundInputHandler: ((e: Event) => void) | null = null;
  private boundBlurHandler: ((e: Event) => void) | null = null;

  // Widget style ("overlay", "pixel", or "hidden")
  private widgetStyle: WidgetStyle = 'overlay';

  // Explanation tracking
  private isShowingExplanation: boolean = false;
  private isShowingSummary: boolean = false;
  private explanationText: string = '';
  private explanationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private explanationContainer: HTMLElement | null = null;

  // Explanation sampling (0-1 probability of showing explanation prompt)
  private explanationSample: number = 1;

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

    // Set explanation sample rate (0-1, clamped)
    if (typeof options.explanationSample === 'number') {
      this.explanationSample = Math.max(0, Math.min(1, options.explanationSample));
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
    const container = document.createElement('div');
    container.setAttribute('data-coolhand-widget', 'true');
    container.className = 'coolhand-feedback-container';

    if (this.useShadowDOM) {
      this.shadowRoot = container.attachShadow({ mode: 'open' });
      this.render(this.shadowRoot);
    } else {
      this.render(container);
    }

    // For input/textarea elements, we need to wrap them since they can't have children
    if (this.isInputElement) {
      this.wrapInputElement(container);
    } else {
      this.targetElement.style.position = 'relative';
      this.targetElement.appendChild(container);
    }

    this.container = container;
  }

  /**
   * Wrap an input/textarea element with a container for the widget
   */
  private wrapInputElement(widgetContainer: HTMLElement): void {
    // Create a wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'coolhand-input-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';

    // Insert wrapper before the input element
    this.targetElement.parentNode?.insertBefore(wrapper, this.targetElement);

    // Move the input into the wrapper
    wrapper.appendChild(this.targetElement);

    // Add the widget container to the wrapper
    wrapper.appendChild(widgetContainer);
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

    // Apply highlight class if attribute is present
    if (this.targetElement.hasAttribute(HIGHLIGHT_ATTRIBUTE) && this.wrapper) {
      this.wrapper.classList.add('coolhand-highlight');
    }
  }

  /**
   * Attach event listeners to widget elements
   */
  private attachEvents(root: ShadowRoot | HTMLElement): void {
    this.wrapper = root.querySelector('.coolhand-feedback-wrapper');
    this.trigger = root.querySelector('.coolhand-trigger');
    this.optionsPanel = root.querySelector('.coolhand-options');
    this.selectedIconContainer = root.querySelector('.coolhand-selected-icon');
    this.statusRegion = root.querySelector('.coolhand-sr-only');
    this.wrapper = root.querySelector('.coolhand-feedback-wrapper');
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
      // Use composedPath() to correctly detect clicks inside Shadow DOM
      const path = e.composedPath();
      const clickedInsideWidget = path.includes(root);

      if (!clickedInsideWidget) {
        if (this.isShowingExplanation) {
          this.closeExplanationUI();
        } else if (this.isShowingSummary) {
          this.closeSummaryUI();
        } else {
          this.hideOptions();
        }
      }
    });

    // Global escape key handler
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.isShowingExplanation) {
          this.closeExplanationUI();
        } else if (this.isShowingSummary) {
          this.closeSummaryUI();
        } else if (this.isExpanded) {
          this.hideOptions();
        }
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

      // Check if feedback already exists - show summary view instead
      const existingFeedbackId = this.targetElement.getAttribute(FEEDBACK_ID_ATTRIBUTE);
      if (existingFeedbackId && this.selectedType) {
        this.showFeedbackSummary();
        return;
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
   * Show summary view of existing feedback
   */
  private showFeedbackSummary(): void {
    if (!this.optionsPanel) return;

    this.isShowingSummary = true;
    const existingExplanation = this.targetElement.getAttribute(EXPLANATION_ATTRIBUTE) || '';

    // Build the summary HTML with all three icons (selected one highlighted)
    const summaryHtml = `
      <div class="coolhand-summary-container">
        <div class="coolhand-summary-header">
          <div class="coolhand-summary-icons" role="radiogroup" aria-label="Change your feedback">
            <button class="coolhand-option${this.selectedType === 'down' ? ' selected' : ''}" data-feedback="down" aria-label="Not useful" role="radio" aria-checked="${this.selectedType === 'down'}">
              <span aria-hidden="true">${thumbsDownIcon}</span>
            </button>
            <button class="coolhand-option${this.selectedType === 'neutral' ? ' selected' : ''}" data-feedback="neutral" aria-label="Somewhat useful" role="radio" aria-checked="${this.selectedType === 'neutral'}">
              <span aria-hidden="true">${neutralIcon}</span>
            </button>
            <button class="coolhand-option${this.selectedType === 'up' ? ' selected' : ''}" data-feedback="up" aria-label="Very useful" role="radio" aria-checked="${this.selectedType === 'up'}">
              <span aria-hidden="true">${thumbsUpIcon}</span>
            </button>
          </div>
          <button class="coolhand-explanation-close" aria-label="Close feedback summary">
            <span aria-hidden="true">${closeIcon}</span>
          </button>
        </div>
        <div id="coolhand-summary-label" class="coolhand-summary-label">Your feedback:</div>
        <textarea
          class="coolhand-explanation-textarea"
          placeholder="How could this result be better?"
          aria-label="Your feedback explanation"
          aria-describedby="coolhand-summary-label"
          rows="3"
        >${existingExplanation}</textarea>
        <button class="coolhand-submit-btn" type="button" aria-label="Submit feedback changes">Submit</button>
      </div>
    `;

    this.optionsPanel.innerHTML = summaryHtml;
    this.optionsPanel.classList.add('expanded', 'summary-mode');
    this.optionsPanel.setAttribute('aria-hidden', 'false');

    // Announce mode change to screen readers
    this.announce('Showing your previous feedback. You can edit your rating or explanation.');

    // Set up event listeners
    const closeBtn = this.optionsPanel.querySelector('.coolhand-explanation-close');
    const textarea = this.optionsPanel.querySelector('.coolhand-explanation-textarea') as HTMLTextAreaElement;
    const feedbackButtons = this.optionsPanel.querySelectorAll('.coolhand-option');
    const submitBtn = this.optionsPanel.querySelector('.coolhand-submit-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.closeSummaryUI();
      });
    }

    if (textarea) {
      this.explanationText = existingExplanation;
      textarea.addEventListener('input', this.handleExplanationInput.bind(this));
      textarea.addEventListener('blur', this.handleExplanationBlur.bind(this));
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleExplanationSubmit();
      });
    }

    // Allow changing feedback selection
    feedbackButtons.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleSummaryFeedbackChange(btn as HTMLElement, feedbackButtons);
      });
    });
  }

  /**
   * Handle feedback change in summary view
   */
  private handleSummaryFeedbackChange(
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
    if (!feedbackType) return;

    const feedbackValue = FEEDBACK_TYPE_TO_VALUE[feedbackType];
    this.selectedFeedback = feedbackValue;
    this.selectedType = feedbackType;

    // Update trigger icon
    if (this.trigger && this.selectedIconContainer) {
      this.selectedIconContainer.innerHTML = FEEDBACK_TYPE_TO_ICON[feedbackType];
      this.trigger.setAttribute('data-selected', feedbackType);
    }

    // Send updated feedback
    this.sendFeedback(feedbackValue);
  }

  /**
   * Close the summary UI
   */
  private closeSummaryUI(): void {
    if (!this.isShowingSummary) return;

    // Send any pending explanation
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }
    if (this.explanationText.trim()) {
      this.sendExplanation();
    }

    this.isShowingSummary = false;

    if (this.optionsPanel) {
      this.optionsPanel.classList.remove('expanded', 'summary-mode');
      this.optionsPanel.setAttribute('aria-hidden', 'true');
    }

    if (this.trigger) {
      this.trigger.style.display = 'flex';
      this.trigger.classList.add('showing-checkmark');
      setTimeout(() => {
        if (this.trigger) {
          this.trigger.classList.remove('showing-checkmark');
        }
      }, 800);
    }

    this.isExpanded = false;
  }

  /**
   * Hide the options panel
   */
  private hideOptions(): void {
    // Only remove highlight if panel was actually open (user interacted)
    const wasExpanded = this.isExpanded;

    this.isExpanded = false;
    if (this.trigger) {
      this.trigger.style.display = 'flex';
      this.trigger.setAttribute('aria-expanded', 'false');
    }
    if (this.optionsPanel) {
      this.optionsPanel.classList.remove('expanded');
      this.optionsPanel.setAttribute('aria-hidden', 'true');
    }
    // Remove highlight only when closing after user interaction
    if (wasExpanded) {
      this.removeHighlight();
    }
  }

  /**
   * Remove the pulsating highlight effect permanently
   */
  private removeHighlight(): void {
    // Remove highlight class from wrapper
    if (this.wrapper) {
      this.wrapper.classList.remove('coolhand-highlight');
    }
    // Remove highlight attribute from target element
    this.targetElement.removeAttribute(HIGHLIGHT_ATTRIBUTE);
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

    // Send feedback to the server, then maybe show explanation UI
    this.sendFeedback(feedbackValue).then(() => {
      // Always remove highlight when user submits feedback (works for all widget styles)
      this.removeHighlight();

      if (this.shouldShowExplanation()) {
        this.showExplanationUI();
      } else {
        // Close the panel without showing explanation
        this.hideOptions();
        // Show checkmark animation
        if (this.trigger) {
          this.trigger.classList.add('showing-checkmark');
          setTimeout(() => {
            if (this.trigger) {
              this.trigger.classList.remove('showing-checkmark');
            }
          }, 800);
        }
      }
    });
  }

  /**
   * Determine whether to show the explanation prompt after feedback
   * Priority: element attribute (float 0-1) > instance sample rate
   */
  private shouldShowExplanation(): boolean {
    // Check element attribute for override (float 0-1)
    const attrValue = this.targetElement.getAttribute(EXPLANATION_PROMPT_ATTRIBUTE);
    let rate = this.explanationSample;

    if (attrValue !== null) {
      const parsed = parseFloat(attrValue);
      if (!isNaN(parsed)) {
        rate = Math.max(0, Math.min(1, parsed));
      }
    }

    if (rate === 0) {
      return false;
    }

    if (rate === 1) {
      return true;
    }

    // Random sampling
    return Math.random() < rate;
  }

  /**
   * Show the explanation textarea UI after feedback selection
   */
  private showExplanationUI(): void {
    if (!this.optionsPanel) return;

    this.isShowingExplanation = true;
    this.explanationText = '';

    // Get the selected feedback icon to show in header
    const selectedIcon = this.selectedType ? FEEDBACK_TYPE_TO_ICON[this.selectedType] : '';

    // Create explanation container HTML
    const explanationHtml = `
      <div class="coolhand-explanation-container">
        <div class="coolhand-explanation-header">
          <span class="coolhand-explanation-icon" aria-hidden="true">${selectedIcon}</span>
          <span id="coolhand-explanation-title" class="coolhand-explanation-title">How could this result be better?</span>
          <button class="coolhand-explanation-close" aria-label="Close without adding explanation">
            <span aria-hidden="true">${closeIcon}</span>
          </button>
        </div>
        <textarea
          class="coolhand-explanation-textarea"
          placeholder="Optional: Tell us more..."
          aria-label="Explain your feedback"
          aria-describedby="coolhand-explanation-title"
          rows="3"
        ></textarea>
        <button class="coolhand-submit-btn" type="button" aria-label="Submit feedback">Submit</button>
      </div>
    `;

    // Clear existing content and add explanation UI
    this.optionsPanel.innerHTML = explanationHtml;
    this.optionsPanel.classList.add('expanded', 'explanation-mode');
    this.optionsPanel.setAttribute('aria-hidden', 'false');

    // Store reference and attach events
    this.explanationContainer = this.optionsPanel.querySelector('.coolhand-explanation-container');
    const textarea = this.optionsPanel.querySelector('.coolhand-explanation-textarea') as HTMLTextAreaElement;
    const closeBtn = this.optionsPanel.querySelector('.coolhand-explanation-close');
    const submitBtn = this.optionsPanel.querySelector('.coolhand-submit-btn');

    if (textarea) {
      textarea.addEventListener('input', this.handleExplanationInput.bind(this));
      textarea.addEventListener('blur', this.handleExplanationBlur.bind(this));
      // Focus the textarea for immediate typing
      setTimeout(() => textarea.focus(), 50);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.closeExplanationUI();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleExplanationSubmit();
      });
    }

    // Hide trigger button during explanation mode
    if (this.trigger) {
      this.trigger.style.display = 'none';
    }
  }

  /**
   * Handle explanation textarea input with debouncing
   */
  private handleExplanationInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.explanationText = textarea.value;

    // Clear any existing timer
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
    }

    // Set new debounce timer
    this.explanationDebounceTimer = setTimeout(() => {
      this.sendExplanation();
    }, DEBOUNCE_MS);
  }

  /**
   * Handle explanation textarea blur - send immediately but don't close
   * (closing is handled by document click handler or X button)
   */
  private handleExplanationBlur(): void {
    // Clear any pending debounce timer
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    // Send explanation if there's any text
    if (this.explanationText.trim()) {
      this.sendExplanation();
    }
  }

  /**
   * Handle explicit submit button click - send explanation and close UI
   */
  private handleExplanationSubmit(): void {
    // Clear any pending debounce timer
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    // Send explanation if there's any text
    if (this.explanationText.trim()) {
      this.sendExplanation();
    }

    // Close the UI (either explanation or summary mode)
    if (this.isShowingExplanation) {
      this.closeExplanationUI();
    } else if (this.isShowingSummary) {
      this.closeSummaryUI();
    }
  }

  /**
   * Send explanation to the API
   */
  private async sendExplanation(): Promise<void> {
    const explanation = this.explanationText.trim();
    if (!explanation) return;

    const existingFeedbackId = this.targetElement.getAttribute(FEEDBACK_ID_ATTRIBUTE);
    if (!existingFeedbackId) {
      console.error('[CoolhandJS] Cannot send explanation: no feedback ID found');
      return;
    }

    const payload: FeedbackApiPayload = {
      llm_request_log_feedback: {
        like: this.selectedFeedback,
        original_output: this.originalText,
        explanation: explanation,
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.clientUniqueId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.clientUniqueId;
    }

    if (this.options.workloadId) {
      payload.llm_request_log_feedback.workload_hashid = this.options.workloadId;
    }

    // Set aria-busy during API call
    if (this.wrapper) {
      this.wrapper.setAttribute('aria-busy', 'true');
    }

    try {
      const response = await fetch(`${COOLHAND_API_URL}/${existingFeedbackId}`, {
        method: 'PATCH',
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
      console.log('[CoolhandJS] Explanation submitted successfully:', data);

      // Store the explanation in a data attribute for later retrieval
      this.targetElement.setAttribute(EXPLANATION_ATTRIBUTE, explanation);

      // Announce success to screen readers
      this.announce('Thank you for your feedback');
    } catch (error) {
      const err = error as Error;
      console.error('[CoolhandJS] Error submitting explanation:', err);

      if (this.options.onError) {
        this.options.onError(err);
      }
    } finally {
      // Clear aria-busy after API call completes
      if (this.wrapper) {
        this.wrapper.setAttribute('aria-busy', 'false');
      }
    }
  }

  /**
   * Close the explanation UI and restore normal state
   */
  private closeExplanationUI(): void {
    if (!this.isShowingExplanation) return;

    // Send any pending explanation
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }
    if (this.explanationText.trim()) {
      this.sendExplanation();
    }

    this.isShowingExplanation = false;
    this.explanationText = '';
    this.explanationContainer = null;

    // Hide the options panel
    if (this.optionsPanel) {
      this.optionsPanel.classList.remove('expanded', 'explanation-mode');
      this.optionsPanel.setAttribute('aria-hidden', 'true');
    }

    // Show trigger with checkmark animation
    if (this.trigger) {
      this.trigger.style.display = 'flex';
      this.trigger.classList.add('showing-checkmark');
      setTimeout(() => {
        if (this.trigger) {
          this.trigger.classList.remove('showing-checkmark');
        }
      }, 800);
    }
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

    // Set aria-busy during API call
    if (this.wrapper) {
      this.wrapper.setAttribute('aria-busy', 'true');
    }

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

      // Store feedback ID on the target element for future updates (for new feedback)
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
    } finally {
      // Clear aria-busy after API call completes
      if (this.wrapper) {
        this.wrapper.setAttribute('aria-busy', 'false');
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

    // Set aria-busy during API call
    if (this.wrapper) {
      this.wrapper.setAttribute('aria-busy', 'true');
    }

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
    } finally {
      // Clear aria-busy after API call completes
      if (this.wrapper) {
        this.wrapper.setAttribute('aria-busy', 'false');
      }
    }
  }

  /**
   * Remove the widget from the DOM and clean up event listeners
   */
  public destroy(): void {
    // Clear any pending debounce timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
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

    // For input/textarea elements, unwrap the element
    if (this.isInputElement && this.container) {
      const wrapper = this.container.parentElement;
      if (wrapper?.classList.contains('coolhand-input-wrapper')) {
        // Move the input back to its original position
        wrapper.parentNode?.insertBefore(this.targetElement, wrapper);
        // Remove the wrapper (which also removes the container)
        wrapper.remove();
        return;
      }
    }

    // Remove the widget container
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
