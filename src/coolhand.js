(function() {
  'use strict';

  const COOLHAND_API_URL = 'https://coolhandlabs.com/api/v2/llm_request_log_feedbacks';
  const VERSION = '0.1.0';

  class CoolhandFeedback {
    constructor() {
      this.apiKey = null;
      this.instances = new WeakMap();
      this.observer = null;
      this.isAutoAttaching = false;
    }

    init(apiKey, options = {}) {
      if (!apiKey) {
        console.error('[CoolhandJS] Error: API key is required. Call CoolhandJS.init("your-api-key") first.');
        return false;
      }
      this.apiKey = apiKey;

      // Auto-attach to existing elements if enabled
      if (options.autoAttach !== false) {
        this.enableAutoAttachment();
      }

      return true;
    }

    enableAutoAttachment() {
      if (this.isAutoAttaching) return;
      this.isAutoAttaching = true;

      // Attach to existing elements
      this.attachToExistingElements();

      // Set up mutation observer for dynamically added elements
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.attachToElementsInNode(node);
            }
          });
        });
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      console.log('[CoolhandJS] Auto-attachment enabled for elements with coolhand-feedback attribute');
    }

    attachToExistingElements() {
      const elements = document.querySelectorAll('[coolhand-feedback="true"], [coolhand-feedback=""], [coolhand-feedback]');
      elements.forEach(element => this.autoAttachToElement(element));
    }

    attachToElementsInNode(node) {
      // Check the node itself
      if (node.hasAttribute && (node.hasAttribute('coolhand-feedback'))) {
        this.autoAttachToElement(node);
      }

      // Check child nodes
      if (node.querySelectorAll) {
        const elements = node.querySelectorAll('[coolhand-feedback="true"], [coolhand-feedback=""], [coolhand-feedback]');
        elements.forEach(element => this.autoAttachToElement(element));
      }
    }

    autoAttachToElement(element) {
      if (this.instances.has(element)) return; // Already attached

      const options = {};

      // Parse options from data attributes
      if (element.dataset.coolhandSessionId) {
        options.sessionId = element.dataset.coolhandSessionId;
      }

      this.attach(element, options);
    }

    attach(element, options = {}) {
      if (!this.apiKey) {
        console.error('[CoolhandJS] Error: API key not initialized. Call CoolhandJS.init("your-api-key") first.');
        return null;
      }

      if (!(element instanceof HTMLElement)) {
        console.error('[CoolhandJS] Error: Invalid element provided. Must be an HTMLElement.');
        return null;
      }

      const textContent = this.extractText(element);
      if (!textContent) {
        console.error('[CoolhandJS] Error: No text content found in element:', element);
        return null;
      }

      if (this.instances.has(element)) {
        console.warn('[CoolhandJS] Warning: Feedback widget already attached to this element.');
        return this.instances.get(element);
      }

      const instance = new FeedbackWidget(element, textContent, this.apiKey, options);
      this.instances.set(element, instance);
      return instance;
    }

    extractText(element) {
      const text = element.textContent || element.innerText || '';
      return text.trim();
    }

    detach(element) {
      const instance = this.instances.get(element);
      if (instance) {
        instance.destroy();
        this.instances.delete(element);
      }
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.isAutoAttaching = false;
    }
  }

  class FeedbackWidget {
    constructor(targetElement, originalText, apiKey, options = {}) {
      this.targetElement = targetElement;
      this.originalText = originalText;
      this.apiKey = apiKey;
      this.options = options;
      this.isExpanded = false;
      this.selectedFeedback = null;
      this.useShadowDOM = this.supportsShadowDOM();

      this.init();
    }

    supportsShadowDOM() {
      return !!(document.head.attachShadow || document.head.createShadowRoot);
    }

    init() {
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

    render(root) {
      const styles = `
        <style>
          :host, .coolhand-feedback-wrapper {
            all: initial;
            display: block;
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }

          .coolhand-feedback-wrapper * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          .coolhand-trigger {
            all: initial;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
          }

          .coolhand-trigger:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            transform: translateY(-1px);
          }

          .coolhand-trigger svg {
            width: 20px;
            height: 20px;
            fill: none;
            stroke: #666;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
          }

          .coolhand-options {
            display: none;
            position: absolute;
            top: 0;
            right: 0;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 140px;
          }

          .coolhand-options.expanded {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .coolhand-option {
            all: initial;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            font-size: 20px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: transparent;
            border: 1px solid transparent;
          }

          .coolhand-option:hover {
            background: #f5f5f5;
            transform: scale(1.15);
          }

          .coolhand-option.selected {
            background: #e3f2fd;
            border-color: #2196F3;
          }

          .coolhand-option[data-feedback="down"]:hover {
            background: #ffebee;
          }

          .coolhand-option[data-feedback="neutral"]:hover {
            background: #fff3e0;
          }

          .coolhand-option[data-feedback="up"]:hover {
            background: #e8f5e9;
          }

          .coolhand-close {
            all: initial;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-left: 8px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s ease;
          }

          .coolhand-close:hover {
            background: #f5f5f5;
          }

          .coolhand-close svg {
            width: 16px;
            height: 16px;
            fill: none;
            stroke: #999;
            stroke-width: 2;
            stroke-linecap: round;
          }

          @keyframes coolhand-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }

          .coolhand-success {
            animation: coolhand-pulse 0.3s ease;
            background: #e8f5e9 !important;
          }

          .coolhand-trigger.has-feedback {
            font-size: 18px;
          }

          .coolhand-trigger.has-feedback svg {
            display: none;
          }

          .coolhand-checkmark {
            display: none;
            width: 20px;
            height: 20px;
            stroke: #4caf50;
            stroke-width: 3;
            fill: none;
          }

          .coolhand-trigger.showing-checkmark .coolhand-checkmark {
            display: block;
          }

          .coolhand-trigger.showing-checkmark svg:not(.coolhand-checkmark) {
            display: none;
          }

          .coolhand-trigger.showing-checkmark {
            background: #e8f5e9;
            border-color: #4caf50;
          }

          .coolhand-emoji-display {
            display: none;
          }

          .coolhand-trigger.has-feedback .coolhand-emoji-display {
            display: block;
          }
        </style>
      `;

      const handIcon = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 22q-.825 0-1.412-.587T5 20v-9q0-.825.588-1.412T7 9h4.5l.4-1.45q.2-.725.775-1.138T14 6q.525 0 .888.363t.362.887v4.75h4.35q.6 0 1 .45t.3 1.05l-1.75 7.9q-.125.5-.537.8t-.913.3H7Z"/>
        </svg>
      `;

      const closeIcon = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      `;

      const checkmarkIcon = `
        <svg class="coolhand-checkmark" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      `;

      const html = `
        ${this.useShadowDOM ? '' : styles}
        <div class="coolhand-feedback-wrapper">
          <button class="coolhand-trigger" aria-label="Provide feedback">
            ${handIcon}
            ${checkmarkIcon}
            <span class="coolhand-emoji-display"></span>
          </button>
          <div class="coolhand-options">
            <button class="coolhand-option" data-feedback="down" aria-label="Thumbs down">👎</button>
            <button class="coolhand-option" data-feedback="neutral" aria-label="Neutral">🤷</button>
            <button class="coolhand-option" data-feedback="up" aria-label="Thumbs up">👍</button>
            <button class="coolhand-close" aria-label="Close">
              ${closeIcon}
            </button>
          </div>
        </div>
      `;

      if (this.useShadowDOM) {
        root.innerHTML = styles + html;
      } else {
        root.innerHTML = html;
      }

      this.attachEvents(root);
    }

    attachEvents(root) {
      this.trigger = root.querySelector('.coolhand-trigger');
      this.optionsPanel = root.querySelector('.coolhand-options');
      this.emojiDisplay = root.querySelector('.coolhand-emoji-display');
      const closeBtn = root.querySelector('.coolhand-close');
      const feedbackBtns = root.querySelectorAll('.coolhand-option');

      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleOptions(this.trigger, this.optionsPanel);
      });

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideOptions(this.trigger, this.optionsPanel);
      });

      feedbackBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleFeedback(btn, feedbackBtns);
        });
      });

      document.addEventListener('click', (e) => {
        if (!root.contains(e.target)) {
          this.hideOptions(this.trigger, this.optionsPanel);
        }
      });
    }

    toggleOptions(trigger, options) {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        trigger.style.display = 'none';
        options.classList.add('expanded');
      } else {
        this.hideOptions(trigger, options);
      }
    }

    hideOptions(trigger, options) {
      this.isExpanded = false;
      trigger.style.display = 'flex';
      options.classList.remove('expanded');
    }

    handleFeedback(selectedBtn, allBtns) {
      allBtns.forEach(btn => btn.classList.remove('selected'));
      selectedBtn.classList.add('selected');

      const feedbackType = selectedBtn.dataset.feedback;
      const emoji = selectedBtn.textContent.trim();
      let feedbackValue;

      switch(feedbackType) {
        case 'down':
          feedbackValue = false;
          break;
        case 'neutral':
          feedbackValue = null;
          break;
        case 'up':
          feedbackValue = true;
          break;
      }

      this.selectedFeedback = feedbackValue;
      this.selectedEmoji = emoji;

      // Close the options panel immediately
      this.hideOptions(this.trigger, this.optionsPanel);

      // Send feedback to the server
      this.sendFeedback(feedbackValue, emoji);
    }

    async sendFeedback(feedbackValue, emoji) {
      const payload = {
        llm_request_log_feedback: {
          like: feedbackValue,
          original_output: this.originalText,
          collector: `coolhand-js-${VERSION}`
        }
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
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('[CoolhandJS] Feedback submitted successfully:', data);

        // Show checkmark briefly
        this.trigger.classList.add('showing-checkmark');

        // After a delay, show the selected emoji on the trigger button
        setTimeout(() => {
          this.trigger.classList.remove('showing-checkmark');
          this.emojiDisplay.textContent = emoji;
          this.trigger.classList.add('has-feedback');
        }, 800);

        if (this.options.onSuccess) {
          this.options.onSuccess(feedbackValue, data);
        }
      } catch (error) {
        console.error('[CoolhandJS] Error submitting feedback:', error);

        if (error.message.includes('CORS')) {
          console.error('[CoolhandJS] CORS error detected. Ensure your domain is whitelisted in the Coolhand dashboard.');
        }

        if (this.options.onError) {
          this.options.onError(error);
        }
      }
    }

    destroy() {
      if (this.container) {
        this.container.remove();
      }
    }
  }

  const coolhand = new CoolhandFeedback();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = coolhand;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return coolhand; });
  } else {
    window.CoolhandJS = coolhand;
  }

  return coolhand;
})();