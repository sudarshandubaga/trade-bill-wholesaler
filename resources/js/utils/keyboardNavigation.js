/**
 * Global Keyboard Navigation Utility for TradeBill ERP
 * 
 * Implements:
 * 1. Enter key moves focus to the next input field instead of Tab across every form
 * 2. On the last input of a form, Enter submits the form
 * 3. Textarea allows standard newline with Enter (Ctrl+Enter or Cmd+Enter to submit)
 * 4. Automatically focuses the first input field when any modal or form opens
 */

let isInitialized = false;

export function setupGlobalFormKeyboardNavigation() {
  if (isInitialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  isInitialized = true;

  // 1. Enter key navigation handler
  document.addEventListener('keydown', (e) => {
    // Only handle Enter without modifier keys (Shift/Ctrl/Meta/Alt)
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // If another handler already handled this (e.g., custom popup logic in POS), respect it
    if (e.defaultPrevented) {
      return;
    }

    const target = e.target;
    if (!target || !target.tagName) return;

    const tagName = target.tagName.toUpperCase();

    // Textarea: If marked with data-enter-submit="true", Enter without Shift submits the form
    if (tagName === 'TEXTAREA') {
      if (target.dataset && target.dataset.enterSubmit === 'true') {
        if (!e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          if (target.form && typeof target.form.requestSubmit === 'function') {
            target.form.requestSubmit();
          } else {
            const form = target.form || target.closest('form');
            const submitBtn = form?.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
            }
          }
        }
      }
      return;
    }

    // Buttons and submit inputs: Allow standard click/submit
    if (tagName === 'BUTTON' || (tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button' || target.type === 'reset'))) {
      return;
    }

    // Process input, select, and custom SearchableSelect trigger elements
    const isSearchableSelect = target.dataset && target.dataset.searchableSelect === 'true';
    if (tagName !== 'INPUT' && tagName !== 'SELECT' && !isSearchableSelect) {
      return;
    }

    // Skip if marked with data-no-enter-nav
    if (target.dataset && target.dataset.noEnterNav === 'true') {
      return;
    }

    // Find the enclosing form or modal dialog
    const container = target.form || target.closest('form') || target.closest('[role="dialog"]') || target.closest('.fixed.inset-0');
    if (!container) return;

    // Selector for interactive form controls
    const selector = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([disabled]):not([readonly])',
      'select:not([disabled]):not([readonly])',
      'div[data-searchable-select="true"]',
      'textarea:not([disabled]):not([readonly])',
      'button[type="submit"]'
    ].join(', ');

    // Collect all visible, enabled elements
    const elements = Array.from(container.querySelectorAll(selector)).filter((el) => {
      // Must be visible in DOM
      return (
        el.offsetParent !== null &&
        window.getComputedStyle(el).display !== 'none' &&
        window.getComputedStyle(el).visibility !== 'hidden' &&
        el.tabIndex !== -1
      );
    });

    const currentIndex = elements.indexOf(target);
    if (currentIndex === -1) return;

    // If there is a next element in the form
    if (currentIndex < elements.length - 1) {
      const nextEl = elements[currentIndex + 1];

      // If the next element is the submit button, submit the form directly
      if (nextEl.tagName === 'BUTTON' && nextEl.type === 'submit') {
        e.preventDefault();
        e.stopPropagation();
        if (target.form && typeof target.form.requestSubmit === 'function') {
          target.form.requestSubmit();
        } else {
          nextEl.click();
        }
      } else {
        // Move focus to next input or searchable select
        e.preventDefault();
        e.stopPropagation();
        nextEl.focus();
        if (nextEl.dataset && nextEl.dataset.searchableSelect === 'true') {
          nextEl.click();
        } else if (typeof nextEl.select === 'function' && nextEl.tagName === 'INPUT' && nextEl.type !== 'checkbox' && nextEl.type !== 'radio') {
          nextEl.select();
        }
      }
    } else {
      // Current element is the last element: Submit the form
      e.preventDefault();
      e.stopPropagation();
      if (target.form && typeof target.form.requestSubmit === 'function') {
        target.form.requestSubmit();
      } else {
        const submitBtn = container.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
        }
      }
    }
  }, false);

  // 2. Auto-focus first input when any modal or form is added to the DOM
  const focusFirstInElement = (container) => {
    if (!container || !container.querySelector) return;
    const firstInput = container.querySelector(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
    );
    if (firstInput && document.activeElement !== firstInput) {
      firstInput.focus();
      if (typeof firstInput.select === 'function' && firstInput.tagName === 'INPUT') {
        firstInput.select();
      }
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const isModal = node.matches && (node.matches('.fixed.inset-0') || node.matches('[role="dialog"]'));
          if (isModal) {
            setTimeout(() => focusFirstInElement(node), 80);
          } else if (node.querySelector) {
            const innerModal = node.querySelector('.fixed.inset-0, [role="dialog"]');
            if (innerModal) {
              setTimeout(() => focusFirstInElement(innerModal), 80);
            }
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 3. Global Escape key to close any active popup, dropdown, or modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    // A. Check if a searchable select dropdown list is currently open
    // In that case, SearchableSelect's keydown handler closes it first
    const openSelectDropdown = document.querySelector('[data-searchable-options-open="true"]');
    if (openSelectDropdown) {
      return;
    }

    // B. Find all open visible modals, overlays, or popups in the DOM
    const openModals = Array.from(
      document.querySelectorAll('.fixed.inset-0, [role="dialog"], .fixed.z-50')
    ).filter((el) => {
      return (
        el.offsetParent !== null &&
        window.getComputedStyle(el).display !== 'none' &&
        window.getComputedStyle(el).visibility !== 'hidden'
      );
    });

    if (openModals.length > 0) {
      // Find the topmost modal
      const topModal = openModals[openModals.length - 1];

      // Look for a close / cancel button inside the modal
      let closeBtn = topModal.querySelector(
        'button[data-modal-close="true"], button[aria-label*="close" i]'
      );
      if (!closeBtn) {
        const buttons = Array.from(topModal.querySelectorAll('button'));
        closeBtn = buttons.find((b) => {
          if (b.querySelector('svg.lucide-x, svg.lucide-x-circle')) return true;
          const txt = b.textContent.trim().toLowerCase();
          return (
            txt === 'cancel' ||
            txt === 'close' ||
            txt === '✕' ||
            txt === 'x' ||
            txt === 'cancel & back'
          );
        });
      }

      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeBtn.click();
      }
    }
  }, false);
}

/**
 * Helper to auto focus the first visible input inside a ref
 */
export function focusFirstInput(containerRefOrEl) {
  const el = containerRefOrEl?.current || containerRefOrEl;
  if (!el || !el.querySelector) return;
  setTimeout(() => {
    const first = el.querySelector(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly])'
    );
    if (first) {
      first.focus();
      if (typeof first.select === 'function' && first.tagName === 'INPUT') {
        first.select();
      }
    }
  }, 50);
}

