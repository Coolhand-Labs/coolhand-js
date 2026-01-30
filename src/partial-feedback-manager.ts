import { PartialFeedbackWidget } from './partial-feedback-widget';
import {
  PARTIAL_FEEDBACKS_ATTRIBUTE,
  PARTIAL_HIGHLIGHT_CLASS,
  MIN_SELECTION_LENGTH,
} from './constants';
import type {
  TextRange,
  PartialFeedbackEntry,
  PartialFeedbackStorage,
  PartialFeedbackOptions,
  FeedbackType,
  FeedbackApiResponse,
} from './types';

/** Highlight styles to inject into document */
const HIGHLIGHT_STYLES = `
  .coolhand-partial-highlight {
    position: relative;
    cursor: pointer;
    border-radius: 2px;
    padding: 0 2px;
    margin: 0 -2px;
    transition: background-color 0.15s ease;
  }

  .coolhand-partial-highlight[data-feedback-type="up"] {
    background-color: rgba(16, 185, 129, 0.2);
  }

  .coolhand-partial-highlight[data-feedback-type="down"] {
    background-color: rgba(239, 68, 68, 0.2);
  }

  .coolhand-partial-highlight[data-feedback-type="neutral"] {
    background-color: rgba(59, 130, 246, 0.2);
  }

  .coolhand-partial-highlight[data-feedback-type="up"]:hover,
  .coolhand-partial-highlight[data-feedback-type="up"]:focus {
    background-color: rgba(16, 185, 129, 0.35);
  }

  .coolhand-partial-highlight[data-feedback-type="down"]:hover,
  .coolhand-partial-highlight[data-feedback-type="down"]:focus {
    background-color: rgba(239, 68, 68, 0.35);
  }

  .coolhand-partial-highlight[data-feedback-type="neutral"]:hover,
  .coolhand-partial-highlight[data-feedback-type="neutral"]:focus {
    background-color: rgba(59, 130, 246, 0.35);
  }

  .coolhand-partial-highlight:focus {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  .coolhand-partial-highlight:focus:not(:focus-visible) {
    outline: none;
  }

  .coolhand-partial-highlight:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .coolhand-partial-highlight {
      transition: none;
    }
  }
`;

/** Track whether styles have been injected */
let stylesInjected = false;

/**
 * Inject highlight styles into the document
 */
function injectHighlightStyles(): void {
  if (stylesInjected) return;

  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-coolhand-partial-highlight-styles', 'true');
  styleElement.textContent = HIGHLIGHT_STYLES;
  document.head.appendChild(styleElement);
  stylesInjected = true;
}

/**
 * PartialFeedbackManager handles text selection detection, highlight persistence,
 * and partial feedback storage for a specific element.
 */
export class PartialFeedbackManager {
  private targetElement: HTMLElement;
  private apiKey: string;
  private options: PartialFeedbackOptions;
  private entries: PartialFeedbackEntry[] = [];
  private activeWidget: PartialFeedbackWidget | null = null;
  private boundMouseUpHandler: (e: MouseEvent) => void;
  private boundKeyUpHandler: (e: KeyboardEvent) => void;
  private boundHighlightMouseEnter: (e: MouseEvent) => void;
  private boundHighlightMouseLeave: (e: MouseEvent) => void;
  private boundHighlightFocus: (e: FocusEvent) => void;
  private boundHighlightKeyDown: (e: KeyboardEvent) => void;
  private hoverTimeout: ReturnType<typeof setTimeout> | null = null;
  private hoveredHighlight: HTMLElement | null = null;

  constructor(
    targetElement: HTMLElement,
    apiKey: string,
    options: PartialFeedbackOptions = {}
  ) {
    this.targetElement = targetElement;
    this.apiKey = apiKey;
    this.options = options;

    // Bind handlers
    this.boundMouseUpHandler = this.handleMouseUp.bind(this);
    this.boundKeyUpHandler = this.handleKeyUp.bind(this);
    this.boundHighlightMouseEnter = this.handleHighlightMouseEnter.bind(this);
    this.boundHighlightMouseLeave = this.handleHighlightMouseLeave.bind(this);
    this.boundHighlightFocus = this.handleHighlightFocus.bind(this);
    this.boundHighlightKeyDown = this.handleHighlightKeyDown.bind(this);

    this.init();
  }

  /**
   * Initialize the manager
   */
  private init(): void {
    // Inject highlight styles into document (once)
    injectHighlightStyles();

    // Load existing feedbacks from data attribute
    this.loadFeedbacks();

    // Restore highlights for existing feedbacks
    this.restoreHighlights();

    // Add event listeners for selection detection
    this.targetElement.addEventListener('mouseup', this.boundMouseUpHandler);
    this.targetElement.addEventListener('keyup', this.boundKeyUpHandler);
  }

  /**
   * Load feedbacks from the data attribute
   */
  private loadFeedbacks(): void {
    const stored = this.targetElement.getAttribute(PARTIAL_FEEDBACKS_ATTRIBUTE);
    if (!stored) {
      this.entries = [];
      return;
    }

    try {
      const parsed: PartialFeedbackStorage = JSON.parse(stored);
      if (parsed.version === 1 && Array.isArray(parsed.entries)) {
        this.entries = parsed.entries;
      } else {
        console.warn('[CoolhandJS] Invalid partial feedbacks format, resetting');
        this.entries = [];
      }
    } catch {
      console.warn('[CoolhandJS] Failed to parse partial feedbacks, resetting');
      this.entries = [];
    }
  }

  /**
   * Save feedbacks to the data attribute
   */
  private saveFeedbacks(): void {
    const storage: PartialFeedbackStorage = {
      version: 1,
      entries: this.entries,
    };
    this.targetElement.setAttribute(
      PARTIAL_FEEDBACKS_ATTRIBUTE,
      JSON.stringify(storage)
    );
  }

  /**
   * Restore highlight marks for existing feedbacks
   */
  private restoreHighlights(): void {
    // Sort entries by startOffset in reverse order to avoid offset shifting
    const sortedEntries = [...this.entries].sort(
      (a, b) => b.range.startOffset - a.range.startOffset
    );

    for (const entry of sortedEntries) {
      this.applyHighlight(entry);
    }
  }

  /**
   * Handle mouseup events for selection detection
   */
  private handleMouseUp(e: MouseEvent): void {
    // Ignore if clicking on a highlight (will be handled by hover)
    const target = e.target as HTMLElement;
    if (target.classList?.contains(PARTIAL_HIGHLIGHT_CLASS)) {
      return;
    }

    // Small delay to ensure selection is complete
    setTimeout(() => this.processSelection(), 10);
  }

  /**
   * Handle keyup events for selection detection (Shift+Arrow keys)
   */
  private handleKeyUp(e: KeyboardEvent): void {
    if (e.shiftKey && (e.key.startsWith('Arrow') || e.key === 'End' || e.key === 'Home')) {
      this.processSelection();
    }
  }

  /**
   * Process the current selection
   */
  private processSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const range = this.getValidSelectionRange(selection);
    if (!range) {
      return;
    }

    // Close any existing widget
    this.closeActiveWidget();

    // Create and show the widget
    this.showWidgetForSelection(range, selection);
  }

  /**
   * Validate and extract a TextRange from the selection
   */
  private getValidSelectionRange(selection: Selection): TextRange | null {
    if (selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    // Check minimum length
    if (text.length < MIN_SELECTION_LENGTH) {
      return null;
    }

    // Check if selection is within the target element
    if (!this.isSelectionWithinElement(range)) {
      return null;
    }

    // Check if selection is within an input or textarea child
    if (this.isSelectionInInput(range)) {
      return null;
    }

    // Check for overlap with existing highlights
    if (this.isOverlappingExistingHighlight(range)) {
      return null;
    }

    // Calculate offsets relative to the target element's text content
    const offsets = this.calculateTextOffsets(range);
    if (!offsets) {
      return null;
    }

    return {
      startOffset: offsets.start,
      endOffset: offsets.end,
      text,
    };
  }

  /**
   * Check if the selection range is within the target element
   */
  private isSelectionWithinElement(range: Range): boolean {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    return (
      this.targetElement.contains(startContainer) &&
      this.targetElement.contains(endContainer)
    );
  }

  /**
   * Check if the selection is within an input or textarea child element
   */
  private isSelectionInInput(range: Range): boolean {
    let node: Node | null = range.startContainer;
    while (node && node !== this.targetElement) {
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement
      ) {
        return true;
      }
      node = node.parentNode;
    }

    node = range.endContainer;
    while (node && node !== this.targetElement) {
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement
      ) {
        return true;
      }
      node = node.parentNode;
    }

    return false;
  }

  /**
   * Check if the selection overlaps with an existing highlight
   */
  private isOverlappingExistingHighlight(range: Range): boolean {
    const highlights = this.targetElement.querySelectorAll(
      `.${PARTIAL_HIGHLIGHT_CLASS}`
    );

    for (const highlight of highlights) {
      if (range.intersectsNode(highlight)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate text offsets within the target element
   */
  private calculateTextOffsets(range: Range): { start: number; end: number } | null {
    const treeWalker = document.createTreeWalker(
      this.targetElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let startOffset = -1;
    let endOffset = -1;
    let node: Node | null;

    while ((node = treeWalker.nextNode())) {
      const textNode = node as Text;
      const nodeLength = textNode.textContent?.length || 0;

      if (node === range.startContainer) {
        startOffset = currentOffset + range.startOffset;
      }

      if (node === range.endContainer) {
        endOffset = currentOffset + range.endOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (startOffset === -1 || endOffset === -1) {
      return null;
    }

    return { start: startOffset, end: endOffset };
  }

  /**
   * Show the partial feedback widget for a new selection
   */
  private showWidgetForSelection(textRange: TextRange, selection: Selection): void {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    this.activeWidget = new PartialFeedbackWidget({
      apiKey: this.apiKey,
      targetElement: this.targetElement,
      textRange,
      originalOutput: this.targetElement.textContent || '',
      position: {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        selectionRect: rect,
      },
      options: this.options,
      onFeedbackSubmitted: (entry, response) => this.handleFeedbackSubmitted(entry, response, selection),
      onClose: () => this.handleWidgetClose(),
      existingEntry: null,
    });
  }

  /**
   * Show the partial feedback widget for an existing highlight
   * @param highlight - The highlight element
   * @param entry - The feedback entry
   * @param cursorPosition - Optional cursor position for positioning below cursor on hover
   */
  private showWidgetForHighlight(
    highlight: HTMLElement,
    entry: PartialFeedbackEntry,
    cursorPosition?: { x: number; y: number }
  ): void {
    const rect = highlight.getBoundingClientRect();

    // If cursor position is provided (from hover), position below cursor
    // Otherwise, position below the highlight (for keyboard focus)
    const top = cursorPosition
      ? cursorPosition.y + window.scrollY + 10 // 10px below cursor
      : rect.bottom + window.scrollY;
    const left = cursorPosition
      ? cursorPosition.x + window.scrollX
      : rect.left + window.scrollX;

    this.activeWidget = new PartialFeedbackWidget({
      apiKey: this.apiKey,
      targetElement: this.targetElement,
      textRange: entry.range,
      originalOutput: this.targetElement.textContent || '',
      position: {
        top,
        left,
        selectionRect: rect,
      },
      options: this.options,
      onFeedbackSubmitted: (updatedEntry, response) =>
        this.handleFeedbackUpdated(updatedEntry, response, highlight),
      onClose: () => this.handleWidgetClose(),
      existingEntry: entry,
    });
  }

  /**
   * Handle feedback submitted for a new selection
   */
  private handleFeedbackSubmitted(
    entry: PartialFeedbackEntry,
    response: FeedbackApiResponse,
    selection: Selection
  ): void {
    // Update entry with API ID
    entry.id = response.id;

    // Add to entries
    this.entries.push(entry);
    this.saveFeedbacks();

    // Clear selection
    selection.removeAllRanges();

    // Apply highlight
    this.applyHighlight(entry);

    // Call success callback
    if (this.options.onPartialFeedbackSuccess) {
      this.options.onPartialFeedbackSuccess(entry, response);
    }
  }

  /**
   * Handle feedback updated for an existing highlight
   */
  private handleFeedbackUpdated(
    updatedEntry: PartialFeedbackEntry,
    response: FeedbackApiResponse,
    highlight: HTMLElement
  ): void {
    // Find and update the entry
    const index = this.entries.findIndex(
      (e) =>
        e.range.startOffset === updatedEntry.range.startOffset &&
        e.range.endOffset === updatedEntry.range.endOffset
    );

    if (index !== -1) {
      this.entries[index] = updatedEntry;
      this.saveFeedbacks();
    }

    // Update highlight appearance
    highlight.setAttribute('data-feedback-type', updatedEntry.feedbackType);
    highlight.setAttribute(
      'aria-label',
      this.getHighlightAriaLabel(updatedEntry)
    );

    // Call success callback
    if (this.options.onPartialFeedbackSuccess) {
      this.options.onPartialFeedbackSuccess(updatedEntry, response);
    }
  }

  /**
   * Handle widget close
   */
  private handleWidgetClose(): void {
    this.activeWidget = null;
  }

  /**
   * Close any active widget
   */
  private closeActiveWidget(): void {
    if (this.activeWidget) {
      this.activeWidget.destroy();
      this.activeWidget = null;
    }
  }

  /**
   * Apply a highlight mark to the text for an entry
   */
  private applyHighlight(entry: PartialFeedbackEntry): void {
    // Create a range for the text to highlight
    const range = this.createRangeFromOffsets(
      entry.range.startOffset,
      entry.range.endOffset
    );

    if (!range) {
      console.warn('[CoolhandJS] Could not create range for highlight');
      return;
    }

    // Create the mark element
    const mark = document.createElement('mark');
    mark.className = PARTIAL_HIGHLIGHT_CLASS;
    mark.setAttribute('data-feedback-type', entry.feedbackType);
    mark.setAttribute('data-feedback-id', String(entry.id || ''));
    mark.setAttribute('tabindex', '0');
    mark.setAttribute('role', 'button');
    mark.setAttribute('aria-label', this.getHighlightAriaLabel(entry));

    // Add event listeners to the mark
    mark.addEventListener('mouseenter', this.boundHighlightMouseEnter);
    mark.addEventListener('mouseleave', this.boundHighlightMouseLeave);
    mark.addEventListener('focus', this.boundHighlightFocus);
    mark.addEventListener('keydown', this.boundHighlightKeyDown);

    // Wrap the selected content
    try {
      range.surroundContents(mark);
    } catch {
      // If surroundContents fails (e.g., crosses element boundaries),
      // try extracting and inserting
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
    }
  }

  /**
   * Create a range from text offsets
   */
  private createRangeFromOffsets(
    startOffset: number,
    endOffset: number
  ): Range | null {
    const treeWalker = document.createTreeWalker(
      this.targetElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let startNode: Text | null = null;
    let startNodeOffset = 0;
    let endNode: Text | null = null;
    let endNodeOffset = 0;
    let node: Node | null;

    while ((node = treeWalker.nextNode())) {
      const textNode = node as Text;
      const nodeLength = textNode.textContent?.length || 0;

      if (!startNode && currentOffset + nodeLength > startOffset) {
        startNode = textNode;
        startNodeOffset = startOffset - currentOffset;
      }

      if (currentOffset + nodeLength >= endOffset) {
        endNode = textNode;
        endNodeOffset = endOffset - currentOffset;
        break;
      }

      currentOffset += nodeLength;
    }

    if (!startNode || !endNode) {
      return null;
    }

    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  /**
   * Get aria-label for a highlight
   */
  private getHighlightAriaLabel(entry: PartialFeedbackEntry): string {
    const feedbackLabels: Record<FeedbackType, string> = {
      up: 'positive',
      neutral: 'neutral',
      down: 'negative',
    };
    return `Highlighted text with ${feedbackLabels[entry.feedbackType]} feedback. Press Enter to edit.`;
  }

  /**
   * Handle mouse entering a highlight
   */
  private handleHighlightMouseEnter(e: MouseEvent): void {
    const highlight = e.target as HTMLElement;

    // Clear any pending hide timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.hoveredHighlight = highlight;

    // Capture cursor position at mouse enter
    const cursorPosition = { x: e.clientX, y: e.clientY };

    // Show widget after a small delay
    this.hoverTimeout = setTimeout(() => {
      if (this.hoveredHighlight === highlight && !this.activeWidget) {
        const entry = this.findEntryForHighlight(highlight);
        if (entry) {
          this.showWidgetForHighlight(highlight, entry, cursorPosition);
        }
      }
    }, 200);
  }

  /**
   * Handle mouse leaving a highlight
   */
  private handleHighlightMouseLeave(e: MouseEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement | null;

    // If moving to the widget, don't close
    if (relatedTarget?.closest('.coolhand-partial-widget-container')) {
      return;
    }

    // Clear pending show timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    this.hoveredHighlight = null;

    // Close widget after a delay
    this.hoverTimeout = setTimeout(() => {
      if (!this.hoveredHighlight) {
        this.closeActiveWidget();
      }
    }, 300);
  }

  /**
   * Handle highlight receiving focus
   */
  private handleHighlightFocus(e: FocusEvent): void {
    const highlight = e.target as HTMLElement;
    const entry = this.findEntryForHighlight(highlight);
    if (entry && !this.activeWidget) {
      this.showWidgetForHighlight(highlight, entry);
    }
  }

  /**
   * Handle keydown on highlight
   */
  private handleHighlightKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const highlight = e.target as HTMLElement;
      const entry = this.findEntryForHighlight(highlight);
      if (entry) {
        this.closeActiveWidget();
        this.showWidgetForHighlight(highlight, entry);
      }
    }
  }

  /**
   * Find the entry for a highlight element
   */
  private findEntryForHighlight(highlight: HTMLElement): PartialFeedbackEntry | null {
    const feedbackId = highlight.getAttribute('data-feedback-id');

    // First try to find by ID
    if (feedbackId) {
      const entry = this.entries.find((e) => String(e.id) === feedbackId);
      if (entry) return entry;
    }

    // Fall back to finding by text content
    const text = highlight.textContent || '';
    return this.entries.find((e) => e.range.text === text) || null;
  }

  /**
   * Clean up and destroy the manager
   */
  public destroy(): void {
    // Close active widget
    this.closeActiveWidget();

    // Clear timeouts
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    // Remove event listeners from target
    this.targetElement.removeEventListener('mouseup', this.boundMouseUpHandler);
    this.targetElement.removeEventListener('keyup', this.boundKeyUpHandler);

    // Remove event listeners from highlights
    const highlights = this.targetElement.querySelectorAll<HTMLElement>(
      `.${PARTIAL_HIGHLIGHT_CLASS}`
    );
    highlights.forEach((highlight) => {
      highlight.removeEventListener('mouseenter', this.boundHighlightMouseEnter as EventListener);
      highlight.removeEventListener('mouseleave', this.boundHighlightMouseLeave as EventListener);
      highlight.removeEventListener('focus', this.boundHighlightFocus as EventListener);
      highlight.removeEventListener('keydown', this.boundHighlightKeyDown as EventListener);
    });

    // Note: We preserve highlights in the DOM (data persists)
  }
}
