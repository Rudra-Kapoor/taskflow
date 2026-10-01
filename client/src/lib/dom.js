/** Low-level DOM helpers shared by overlay primitives (Modal, Popover, mobile drawer). */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Visible, keyboard-focusable descendants of `container`, in DOM order. */
export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('inert') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0,
  );
}

/**
 * Keeps Tab / Shift+Tab inside `container`; call it from the container's keydown handler.
 * Focus wraps from the last focusable element to the first (and back).
 */
export function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

let scrollLocks = 0;
let previousBodyStyles = null;

/** Prevents the page behind an overlay from scrolling. Ref-counted for nested overlays. */
export function lockBodyScroll() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;

  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
  previousBodyStyles = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

export function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0 || !previousBodyStyles) return;

  document.body.style.overflow = previousBodyStyles.overflow;
  document.body.style.paddingRight = previousBodyStyles.paddingRight;
  previousBodyStyles = null;
}

/** Space-separated id list for `aria-describedby` / `aria-labelledby` (undefined when empty). */
export function joinIds(...ids) {
  return ids.filter(Boolean).join(' ') || undefined;
}

/** Combines several refs (object or callback) into one callback ref. */
export function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') ref(node);
      else if (ref && typeof ref === 'object') ref.current = node;
    });
  };
}

/** True when the user is on macOS / iOS (used for ⌘ vs Ctrl shortcut hints). */
export function isApplePlatform() {
  if (typeof navigator === 'undefined') return false;
  // iPadOS reports a Mac platform, so this covers every Apple device.
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || '');
}
