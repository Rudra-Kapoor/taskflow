import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getFocusableElements, lockBodyScroll, trapFocus, unlockBodyScroll } from '@/lib/dom';
import { IconButton } from './IconButton';

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-6xl',
};

/** Open modals, top-most last: only the top one reacts to Escape. */
const modalStack = [];

/**
 * Accessible dialog rendered in a portal: overlay blur, Escape / overlay click to close,
 * focus trap + restore, body scroll lock, centred card on desktop and bottom sheet on mobile.
 *
 * Extra props: `hideCloseButton`, `bodyClassName`, `ariaLabel` (accessible name when there is no
 * `title`). Add `data-autofocus` to the element that should receive focus first (defaults to the
 * first focusable element in the body).
 */
export function Modal({ open, ...props }) {
  if (!open) return null;
  return createPortal(<ModalPanel {...props} />, document.body);
}

function ModalPanel({
  onClose,
  title,
  description,
  size = 'md',
  footer,
  dismissible = true,
  hideCloseButton = false,
  ariaLabel,
  className,
  bodyClassName,
  children,
}) {
  const panelRef = useRef(null);
  const pointerDownOnBackdrop = useRef(false);
  const token = useId();
  const titleId = `${token}-title`;
  const descriptionId = `${token}-description`;

  // Latest callbacks without re-running the mount effect.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    modalStack.push(token);
    lockBodyScroll();
    const previouslyFocused = document.activeElement;

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const focusables = getFocusableElements(panel);
      const target =
        panel.querySelector('[data-autofocus]') ??
        focusables.find((element) => !element.hasAttribute('data-modal-close')) ??
        focusables[0] ??
        panel;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || modalStack[modalStack.length - 1] !== token) return;
      if (!dismissibleRef.current) return;
      event.stopPropagation();
      onCloseRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      const index = modalStack.lastIndexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      unlockBodyScroll();
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [token]);

  const hasHeader = Boolean(title || description);
  const showClose = dismissible && !hideCloseButton;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6"
        onMouseDown={(event) => {
          pointerDownOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (
            dismissible &&
            pointerDownOnBackdrop.current &&
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          onKeyDown={(event) => trapFocus(event, panelRef.current)}
          className={cn(
            'relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-line bg-surface',
            'rounded-t-2xl shadow-2xl outline-none animate-sheet-up',
            'sm:max-h-[88vh] sm:rounded-2xl sm:animate-scale-in',
            SIZES[size] ?? SIZES.md,
            className,
          )}
        >
          {hasHeader ? (
            <div className="flex shrink-0 items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              {showClose && (
                <IconButton
                  icon={X}
                  label="Close"
                  size="sm"
                  onClick={onClose}
                  data-modal-close=""
                  className="-mr-2 -mt-1"
                />
              )}
            </div>
          ) : (
            showClose && (
              <IconButton
                icon={X}
                label="Close"
                size="sm"
                onClick={onClose}
                data-modal-close=""
                className="absolute right-3 top-3 z-10"
              />
            )
          )}

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6',
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
