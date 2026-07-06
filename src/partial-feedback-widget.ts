import { partialWidgetStyles } from './styles/partial-widget.css';
import {
  thumbsUpIcon,
  thumbsDownIcon,
  neutralIcon,
  closeIcon,
} from './icons/icons';
import { COOLHAND_API_URL, VERSION, DEBOUNCE_MS } from './constants';
import type {
  TextRange,
  PartialFeedbackEntry,
  PartialFeedbackOptions,
  FeedbackType,
  FeedbackValue,
  FeedbackApiResponse,
  PartialFeedbackApiPayload,
  ColorScheme,
} from './types';
import { FEEDBACK_TYPE_TO_VALUE } from './types';

interface WidgetPosition {
  top: number;
  left: number;
  selectionRect: DOMRect;
}

interface PartialFeedbackWidgetOptions {
  apiKey: string;
  targetElement: HTMLElement;
  textRange: TextRange;
  originalOutput: string;
  position: WidgetPosition;
  options: PartialFeedbackOptions;
  onFeedbackSubmitted: (entry: PartialFeedbackEntry, response: FeedbackApiResponse) => void;
  onClose: () => void;
  existingEntry: PartialFeedbackEntry | null;
}

/**
 * PartialFeedbackWidget is a compact feedback UI that appears near text selections.
 */
export class PartialFeedbackWidget {
  private apiKey: string;
  private apiUrl: string;
  private targetElement: HTMLElement;
  private textRange: TextRange;
  private originalOutput: string;
  private position: WidgetPosition;
  private options: PartialFeedbackOptions;
  private onFeedbackSubmitted: (entry: PartialFeedbackEntry, response: FeedbackApiResponse) => void;
  private onClose: () => void;
  private existingEntry: PartialFeedbackEntry | null;

  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private useShadowDOM: boolean;
  private selectedType: FeedbackType | null = null;
  private selectedFeedback: FeedbackValue = null;
  private feedbackButtons: NodeListOf<Element> | null = null;
  private statusRegion: HTMLElement | null = null;
  private isShowingExplanation: boolean = false;
  private explanationText: string = '';
  private explanationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplanationPending: boolean = false;
  private currentEntry: PartialFeedbackEntry | null = null;

  private boundDocumentClickHandler: (e: MouseEvent) => void;
  private boundDocumentKeyDownHandler: (e: KeyboardEvent) => void;
  private boundResizeHandler: () => void;

  constructor(config: PartialFeedbackWidgetOptions) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.options.apiUrl || COOLHAND_API_URL;
    this.targetElement = config.targetElement;
    this.textRange = config.textRange;
    this.originalOutput = config.originalOutput;
    this.position = config.position;
    this.options = config.options;
    this.onFeedbackSubmitted = config.onFeedbackSubmitted;
    this.onClose = config.onClose;
    this.existingEntry = config.existingEntry;

    this.useShadowDOM = this.supportsShadowDOM();

    // Initialize from existing entry if editing
    if (this.existingEntry) {
      this.selectedType = this.existingEntry.feedbackType;
      this.selectedFeedback = FEEDBACK_TYPE_TO_VALUE[this.selectedType];
      this.explanationText = this.existingEntry.explanation || '';
      this.currentEntry = { ...this.existingEntry };
    }

    // Bind handlers
    this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
    this.boundDocumentKeyDownHandler = this.handleDocumentKeyDown.bind(this);
    this.boundResizeHandler = this.handleResize.bind(this);

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
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'coolhand-partial-widget-container';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'Provide feedback on selected text');

    if (this.useShadowDOM) {
      this.shadowRoot = this.container.attachShadow({ mode: 'open' });
      this.render(this.shadowRoot);
    } else {
      this.render(this.container);
    }

    // Position the widget
    this.updatePosition();

    // Add to document
    document.body.appendChild(this.container);

    // Add event listeners
    document.addEventListener('click', this.boundDocumentClickHandler, true);
    document.addEventListener('keydown', this.boundDocumentKeyDownHandler);
    window.addEventListener('resize', this.boundResizeHandler);

    // Focus first option for keyboard users
    setTimeout(() => {
      const root = this.shadowRoot || this.container;
      const firstOption = root?.querySelector('.coolhand-option') as HTMLElement;
      if (firstOption) firstOption.focus();
    }, 50);
  }

  /**
   * Get the effective color scheme class
   */
  private getColorSchemeClass(): string {
    let effectiveScheme: ColorScheme = this.options.colorScheme || 'light';

    if (effectiveScheme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        effectiveScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        effectiveScheme = 'light';
      }
    }

    return effectiveScheme === 'dark' ? ' coolhand-dark' : '';
  }

  /**
   * Render the widget HTML
   */
  private render(root: ShadowRoot | HTMLElement): void {
    const colorSchemeClass = this.getColorSchemeClass();
    const isEditing = !!this.existingEntry;

    const html = `
      ${this.useShadowDOM ? '' : partialWidgetStyles}
      <div class="coolhand-partial-widget${colorSchemeClass}" role="region" aria-label="Feedback options">
        <div class="coolhand-sr-only" aria-live="polite" aria-atomic="true"></div>
        <div class="coolhand-partial-options" role="radiogroup" aria-label="Rate this selection">
          <button
            class="coolhand-option${this.selectedType === 'down' ? ' selected' : ''}"
            data-feedback="down"
            aria-label="Not useful"
            role="radio"
            aria-checked="${this.selectedType === 'down'}">
            <span aria-hidden="true">${thumbsDownIcon}</span>
          </button>
          <button
            class="coolhand-option${this.selectedType === 'neutral' ? ' selected' : ''}"
            data-feedback="neutral"
            aria-label="Somewhat useful"
            role="radio"
            aria-checked="${this.selectedType === 'neutral'}">
            <span aria-hidden="true">${neutralIcon}</span>
          </button>
          <button
            class="coolhand-option${this.selectedType === 'up' ? ' selected' : ''}"
            data-feedback="up"
            aria-label="Very useful"
            role="radio"
            aria-checked="${this.selectedType === 'up'}">
            <span aria-hidden="true">${thumbsUpIcon}</span>
          </button>
          <button class="coolhand-partial-close" aria-label="Close feedback panel">
            <span aria-hidden="true">${closeIcon}</span>
          </button>
        </div>
        ${isEditing ? `
        <div class="coolhand-partial-explanation">
          <textarea
            class="coolhand-partial-textarea"
            placeholder="Optional: Add a note..."
            aria-label="Feedback explanation"
            rows="2"
          >${this.explanationText}</textarea>
        </div>
        ` : ''}
      </div>
    `;

    if (this.useShadowDOM) {
      root.innerHTML = partialWidgetStyles + html;
    } else {
      root.innerHTML = html;
    }

    this.attachEvents(root);
  }

  /**
   * Attach event listeners
   */
  private attachEvents(root: ShadowRoot | HTMLElement): void {
    this.statusRegion = root.querySelector('.coolhand-sr-only');
    const closeBtn = root.querySelector('.coolhand-partial-close');
    this.feedbackButtons = root.querySelectorAll('.coolhand-option');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.close();
      });
    }

    this.feedbackButtons?.forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleFeedback(btn as HTMLElement);
      });
    });

    // Set up keyboard navigation
    const optionsContainer = root.querySelector('.coolhand-partial-options');
    optionsContainer?.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e as KeyboardEvent);
    });

    // Set up explanation textarea if present
    const textarea = root.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.addEventListener('input', this.handleExplanationInput.bind(this));
      textarea.addEventListener('blur', this.handleExplanationBlur.bind(this));
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(e: KeyboardEvent): void {
    if (!this.feedbackButtons) return;

    const buttons = Array.from(this.feedbackButtons) as HTMLElement[];
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
        this.close();
        break;
    }
  }

  /**
   * Handle feedback selection
   */
  private handleFeedback(selectedBtn: HTMLElement): void {
    const feedbackType = selectedBtn.dataset.feedback as FeedbackType | undefined;
    if (!feedbackType) return;

    // Update visual state
    this.feedbackButtons?.forEach((btn) => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    selectedBtn.classList.add('selected');
    selectedBtn.setAttribute('aria-checked', 'true');

    this.selectedType = feedbackType;
    this.selectedFeedback = FEEDBACK_TYPE_TO_VALUE[feedbackType];

    // Submit feedback
    this.submitFeedback();
  }

  /**
   * Submit feedback to the API
   */
  private async submitFeedback(): Promise<void> {
    if (this.selectedType === null) return;

    const isUpdate = this.existingEntry !== null && this.existingEntry.id !== null;

    // Create entry
    const entry: PartialFeedbackEntry = this.currentEntry || {
      id: this.existingEntry?.id || null,
      partialId: this.existingEntry?.partialId || null,
      range: this.textRange,
      feedbackType: this.selectedType,
      explanation: this.explanationText || undefined,
      createdAt: this.existingEntry?.createdAt || new Date().toISOString(),
    };

    // Update entry with current values
    entry.feedbackType = this.selectedType;
    if (this.explanationText) {
      entry.explanation = this.explanationText;
    }
    this.currentEntry = entry;

    // Build API payload
    const payload: PartialFeedbackApiPayload = {
      llm_request_log_feedback: {
        like: this.selectedFeedback,
        original_output: this.originalOutput,
        focus_section: this.textRange.text,
        focus_range: {
          start: this.textRange.startOffset,
          end: this.textRange.endOffset,
        },
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.clientUniqueId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.clientUniqueId;
    }

    if (this.options.creatorUniqueId) {
      payload.llm_request_log_feedback.creator_unique_id = this.options.creatorUniqueId;
    }

    if (this.options.coolhandFingerprintId) {
      payload.llm_request_log_feedback.coolhand_fingerprint_id = this.options.coolhandFingerprintId;
    }

    if (this.options.workloadId) {
      payload.llm_request_log_feedback.workload_hashid = this.options.workloadId;
    }

    if (this.explanationText) {
      payload.llm_request_log_feedback.explanation = this.explanationText;
    }

    // Include partial_id when updating an existing partial
    if (isUpdate && this.existingEntry?.partialId) {
      payload.llm_request_log_feedback.partial_id = this.existingEntry.partialId;
    }

    // Determine URL and method
    const url = isUpdate
      ? `${this.apiUrl}/${this.existingEntry!.id}`
      : this.apiUrl;
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
      console.log(`[CoolhandJS] Partial feedback ${action} successfully:`, data);

      // Announce success
      this.announce('Feedback submitted successfully');

      // Update entry with API ID
      entry.id = data.id;

      // Store partial ID for future updates
      if (data.created_partial_id) {
        entry.partialId = data.created_partial_id;
      } else if (data.updated_partial_id) {
        entry.partialId = data.updated_partial_id;
      }

      this.currentEntry = entry;

      // Notify parent
      this.onFeedbackSubmitted(entry, data);

      // If this is a new feedback, show explanation or close
      if (!isUpdate) {
        if (this.shouldShowExplanation()) {
          this.showExplanation();
        } else {
          this.close();
        }
      }
    } catch (error) {
      const err = error as Error;
      console.error('[CoolhandJS] Error submitting partial feedback:', err);

      // Announce error
      this.announce('Error submitting feedback. Please try again.');

      // Call error callback
      if (this.options.onPartialFeedbackError) {
        this.options.onPartialFeedbackError(err, entry);
      }
    }
  }

  /**
   * Determine whether to show explanation prompt
   */
  private shouldShowExplanation(): boolean {
    const rate = typeof this.options.explanationSample === 'number'
      ? Math.max(0, Math.min(1, this.options.explanationSample))
      : 1;

    if (rate === 0) return false;
    if (rate === 1) return true;
    return Math.random() < rate;
  }

  /**
   * Show explanation textarea
   */
  private showExplanation(): void {
    this.isShowingExplanation = true;

    const root = this.shadowRoot || this.container;
    if (!root) return;

    const widget = root.querySelector('.coolhand-partial-widget');
    if (!widget) return;

    // Check if explanation already exists
    let explanationDiv = widget.querySelector('.coolhand-partial-explanation');
    if (!explanationDiv) {
      // Add explanation textarea
      explanationDiv = document.createElement('div');
      explanationDiv.className = 'coolhand-partial-explanation';
      explanationDiv.innerHTML = `
        <textarea
          class="coolhand-partial-textarea"
          placeholder="Optional: Add a note..."
          aria-label="Feedback explanation"
          rows="2"
        ></textarea>
        <button class="coolhand-partial-submit" aria-label="Submit feedback">Submit</button>
      `;
      widget.appendChild(explanationDiv);

      // Attach events
      const textarea = explanationDiv.querySelector('.coolhand-partial-textarea') as HTMLTextAreaElement;
      const submitBtn = explanationDiv.querySelector('.coolhand-partial-submit');

      textarea?.addEventListener('input', this.handleExplanationInput.bind(this));
      textarea?.addEventListener('blur', this.handleExplanationBlur.bind(this));
      submitBtn?.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        this.handleExplanationSubmit();
      });

      // Focus textarea
      setTimeout(() => textarea?.focus(), 50);
    }

    // Reposition widget
    this.updatePosition();
  }

  /**
   * Handle explanation input
   */
  private handleExplanationInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.explanationText = textarea.value;

    // Clear existing timer
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
    }

    // Set new debounce timer
    this.explanationDebounceTimer = setTimeout(() => {
      if (this.explanationText.trim() && this.currentEntry) {
        this.sendExplanation();
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Handle explanation blur
   */
  private handleExplanationBlur(): void {
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    if (this.explanationText.trim() && this.currentEntry) {
      this.sendExplanation();
    }
  }

  /**
   * Handle explanation submit button click
   */
  private handleExplanationSubmit(): void {
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    if (this.explanationText.trim() && this.currentEntry) {
      this.sendExplanation().then(() => {
        this.close();
      });
    } else {
      this.close();
    }
  }

  /**
   * Send explanation to the API
   */
  private async sendExplanation(): Promise<void> {
    if (!this.currentEntry || !this.currentEntry.id) {
      return;
    }

    const explanation = this.explanationText.trim();
    if (!explanation) return;

    // Prevent concurrent requests
    if (this.isExplanationPending) {
      return;
    }
    this.isExplanationPending = true;

    // Update entry
    this.currentEntry.explanation = explanation;

    const payload: PartialFeedbackApiPayload = {
      llm_request_log_feedback: {
        like: this.selectedFeedback,
        original_output: this.originalOutput,
        focus_section: this.textRange.text,
        focus_range: {
          start: this.textRange.startOffset,
          end: this.textRange.endOffset,
        },
        explanation,
        collector: `coolhand-js-${VERSION}`,
      },
    };

    if (this.options.clientUniqueId) {
      payload.llm_request_log_feedback.client_unique_id = this.options.clientUniqueId;
    }

    if (this.options.creatorUniqueId) {
      payload.llm_request_log_feedback.creator_unique_id = this.options.creatorUniqueId;
    }

    if (this.options.coolhandFingerprintId) {
      payload.llm_request_log_feedback.coolhand_fingerprint_id = this.options.coolhandFingerprintId;
    }

    if (this.options.workloadId) {
      payload.llm_request_log_feedback.workload_hashid = this.options.workloadId;
    }

    // Include partial_id to target the specific partial for updates
    if (this.currentEntry.partialId) {
      payload.llm_request_log_feedback.partial_id = this.currentEntry.partialId;
    }

    try {
      const response = await fetch(`${this.apiUrl}/${this.currentEntry.id}`, {
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
      console.log('[CoolhandJS] Partial feedback explanation submitted:', data);

      // Clear explanation text to prevent duplicate sends
      this.explanationText = '';

      // Announce success
      this.announce('Explanation saved');

      // Notify parent with updated entry
      this.onFeedbackSubmitted(this.currentEntry, data);
    } catch (error) {
      const err = error as Error;
      console.error('[CoolhandJS] Error submitting partial feedback explanation:', err);

      if (this.options.onPartialFeedbackError && this.currentEntry) {
        this.options.onPartialFeedbackError(err, this.currentEntry);
      }
    } finally {
      this.isExplanationPending = false;
    }
  }

  /**
   * Update widget position
   */
  private updatePosition(): void {
    if (!this.container) return;

    const rect = this.position.selectionRect;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get widget dimensions
    this.container.style.visibility = 'hidden';
    this.container.style.display = 'block';
    const widgetRect = this.container.getBoundingClientRect();
    this.container.style.visibility = '';

    let top = rect.bottom + 8;
    let left = rect.left;

    // Check if widget would go below viewport
    if (top + widgetRect.height > viewportHeight) {
      top = rect.top - widgetRect.height - 8;
    }

    // Check if widget would go past right edge
    if (left + widgetRect.width > viewportWidth) {
      left = viewportWidth - widgetRect.width - 8;
    }

    // Ensure not past left edge
    if (left < 8) {
      left = 8;
    }

    // Ensure not past top edge
    if (top < 8) {
      top = 8;
    }

    this.container.style.position = 'fixed';
    this.container.style.top = `${top}px`;
    this.container.style.left = `${left}px`;
    this.container.style.zIndex = '100000';
  }

  /**
   * Handle document click
   */
  private handleDocumentClick(e: MouseEvent): void {
    const target = e.target as Node;

    // Check if click is inside the widget
    if (this.container?.contains(target)) {
      return;
    }

    // Check if click is inside shadow DOM
    const path = e.composedPath();
    if (path.includes(this.container as EventTarget)) {
      return;
    }

    // Click outside - close
    this.close();
  }

  /**
   * Handle document keydown
   */
  private handleDocumentKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    this.updatePosition();
  }

  /**
   * Announce a message to screen readers
   */
  private announce(message: string): void {
    if (this.statusRegion) {
      this.statusRegion.textContent = message;
      setTimeout(() => {
        if (this.statusRegion) this.statusRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Close the widget
   */
  private close(): void {
    // Send any unsaved explanation before closing
    if (this.explanationText.trim() && this.currentEntry && !this.isExplanationPending) {
      // Don't await - let it send in background
      this.sendExplanation().catch((err) => {
        console.error('[CoolhandJS] Failed to save explanation on close:', err);
      });
    }

    // Clear debounce timer
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    this.onClose();
    this.destroy();
  }

  /**
   * Destroy the widget
   */
  public destroy(): void {
    // Clear timers
    if (this.explanationDebounceTimer) {
      clearTimeout(this.explanationDebounceTimer);
      this.explanationDebounceTimer = null;
    }

    // Remove event listeners
    document.removeEventListener('click', this.boundDocumentClickHandler, true);
    document.removeEventListener('keydown', this.boundDocumentKeyDownHandler);
    window.removeEventListener('resize', this.boundResizeHandler);

    // Remove from DOM
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
