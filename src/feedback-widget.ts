import { widgetStyles } from './styles/widget.css';
import {
  triggerIcon,
  closeIcon,
  checkmarkIcon,
  thumbsUpIcon,
  thumbsDownIcon,
  neutralIcon,
} from './icons/icons';
import { COOLHAND_API_URL, VERSION } from './constants';
import type {
  FeedbackValue,
  FeedbackType,
  AttachOptions,
  FeedbackApiPayload,
  FeedbackApiResponse,
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

    this.init();
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

    const html = `
      ${this.useShadowDOM ? '' : widgetStyles}
      <div class="coolhand-feedback-wrapper" role="region" aria-label="Feedback">
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
    const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);

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

    // Close the options panel immediately
    this.hideOptions();

    // Return focus to trigger for keyboard users
    if (this.trigger) this.trigger.focus();

    // Immediately update the trigger to show the selected feedback icon
    if (this.trigger && this.selectedIconContainer) {
      this.selectedIconContainer.innerHTML = FEEDBACK_TYPE_TO_ICON[feedbackType];
      this.trigger.setAttribute('data-selected', feedbackType);
      this.trigger.classList.add('has-feedback');
    }

    // Send feedback to the server
    this.sendFeedback(feedbackValue);
  }

  /**
   * Send feedback to the API
   */
  private async sendFeedback(feedbackValue: FeedbackValue): Promise<void> {
    const payload: FeedbackApiPayload = {
      llm_request_log_feedback: {
        like: feedbackValue,
        original_output: this.originalText,
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.sessionId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.sessionId;
    }

    try {
      const response = await fetch(COOLHAND_API_URL, {
        method: 'POST',
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
      console.log('[CoolhandJS] Feedback submitted successfully:', data);

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
   * Remove the widget from the DOM
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
    }
  }
}
