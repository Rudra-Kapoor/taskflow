import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { getFocusableElements } from '@/lib/dom';

const VIEWPORT_MARGIN = 8;

const ORIGINS = {
  'bottom-start': 'top left',
  'bottom-center': 'top center',
  'bottom-end': 'top right',
  'top-start': 'bottom left',
  'top-center': 'bottom center',
  'top-end': 'bottom right',
};

/**
 * Floating panel anchored to an element. Rendered in a portal with fixed positioning so it is never
 * clipped by scroll containers (board columns, modals); flips above/below when space runs out and
 * stays inside the viewport. Closes on outside pointer-down and Escape (focus returns to anchor).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('react').RefObject<HTMLElement>} props.anchorRef
 * @param {'start'|'center'|'end'} [props.align='start']
 * @param {'bottom'|'top'} [props.side='bottom']
 * @param {'container'|'first'|'last'|'none'} [props.initialFocus='container']
 * @param {boolean} [props.closeOnTab=false] close (and refocus the anchor) on Tab - for menus
 */
export function Popover({ open, ...props }) {
  if (!open) return null;
  return createPortal(<PopoverPanel {...props} />, document.body);
}

function PopoverPanel({
  anchorRef,
  onClose,
  align = 'start',
  side = 'bottom',
  offset = 6,
  role = 'dialog',
  initialFocus = 'container',
  closeOnTab = false,
  className,
  style,
  onKeyDown,
  children,
  ...props
}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999, placement: side });

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom - offset - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - offset - VIEWPORT_MARGIN;
    let placement = side;
    if (side === 'bottom' && height > spaceBelow && spaceAbove > spaceBelow) placement = 'top';
    if (side === 'top' && height > spaceAbove && spaceBelow > spaceAbove) placement = 'bottom';

    let top = placement === 'bottom' ? rect.bottom + offset : rect.top - offset - height;
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, viewportHeight - height - VIEWPORT_MARGIN));

    let left = rect.left;
    if (align === 'end') left = rect.right - width;
    if (align === 'center') left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - width - VIEWPORT_MARGIN));

    setPosition((current) =>
      current.top === top && current.left === left && current.placement === placement
        ? current
        : { top, left, placement },
    );
  }, [anchorRef, align, side, offset]);

  // Position before paint, then follow scroll / resize / content size changes.
  useLayoutEffect(() => {
    updatePosition();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => updatePosition());
    if (panelRef.current) observer?.observe(panelRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  // Outside pointer-down and Escape close the popover.
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (anchorRef?.current?.contains(event.target)) return;
      onCloseRef.current?.();
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onCloseRef.current?.();
      anchorRef?.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [anchorRef]);

  // Initial focus (menus focus their first item when opened from the keyboard).
  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || initialFocusRef.current === 'none') return;
    const items = Array.from(
      panel.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'),
    );
    const candidates = items.length ? items : getFocusableElements(panel);
    const target =
      (initialFocusRef.current === 'first' && candidates[0]) ||
      (initialFocusRef.current === 'last' && candidates[candidates.length - 1]) ||
      panel;
    target.focus({ preventScroll: true });
  }, []);

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Tab' && closeOnTab) {
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current?.();
      anchorRef?.current?.focus({ preventScroll: true });
    }
  };

  // Dialog-style popovers close once keyboard focus moves somewhere else on the page.
  const handleBlur = (event) => {
    const next = event.relatedTarget;
    if (!next || panelRef.current?.contains(next) || anchorRef?.current?.contains(next)) return;
    onCloseRef.current?.();
  };

  return (
    <div
      ref={panelRef}
      role={role}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transformOrigin: ORIGINS[`${position.placement}-${align}`],
        ...style,
      }}
      className={cn(
        'z-[60] animate-dropdown-in rounded-lg border border-line bg-surface shadow-popover outline-none',
        'dark:border-line-strong dark:shadow-black/60',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
