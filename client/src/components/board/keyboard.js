/** True while a modal dialog (task modal, confirmation…) is open on top of the page. */
export function isModalOpen() {
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}

/** True when a key press is aimed at a text field (shortcuts must not fire while typing). */
export function isTypingTarget(target) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}
