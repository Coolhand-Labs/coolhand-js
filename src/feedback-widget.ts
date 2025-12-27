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
    const html = `
      ${this.useShadowDOM ? '' : widgetStyles}
      <div class="coolhand-feedback-wrapper">
        <button class="coolhand-trigger" aria-label="Provide feedback">
          <span class="coolhand-trigger-icon">${triggerIcon}</span>
          ${checkmarkIcon}
          <span class="coolhand-selected-icon"></span>
        </button>
        <div class="coolhand-options">
          <div class="coolhand-prompt">Was this useful?</div>
          <div class="coolhand-options-row">
            <button class="coolhand-option" data-feedback="down" aria-label="Thumbs down">
              ${thumbsDownIcon}
            </button>
            <button class="coolhand-option" data-feedback="neutral" aria-label="Neutral">
              ${neutralIcon}
            </button>
            <button class="coolhand-option" data-feedback="up" aria-label="Thumbs up">
              ${thumbsUpIcon}
            </button>
            <button class="coolhand-close" aria-label="Close">
              ${closeIcon}
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
    const closeBtn = root.querySelector('.coolhand-close');
    const feedbackBtns = root.querySelectorAll('.coolhand-option');

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

    feedbackBtns.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleFeedback(btn as HTMLElement, feedbackBtns);
      });
    });

    document.addEventListener('click', (e: Event) => {
      if (!root.contains(e.target as Node)) {
        this.hideOptions();
      }
    });
  }

  /**
   * Toggle the options panel visibility
   */
  private toggleOptions(): void {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      if (this.trigger) this.trigger.style.display = 'none';
      if (this.optionsPanel) this.optionsPanel.classList.add('expanded');
    } else {
      this.hideOptions();
    }
  }

  /**
   * Hide the options panel
   */
  private hideOptions(): void {
    this.isExpanded = false;
    if (this.trigger) this.trigger.style.display = 'flex';
    if (this.optionsPanel) this.optionsPanel.classList.remove('expanded');
  }

  /**
   * Handle feedback selection
   */
  private handleFeedback(
    selectedBtn: HTMLElement,
    allBtns: NodeListOf<Element>
  ): void {
    allBtns.forEach((btn) => btn.classList.remove('selected'));
    selectedBtn.classList.add('selected');

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
