import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { mergeRefs } from '@/lib/dom';
import { Popover } from './Popover';

const DropdownContext = createContext(null);

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * Accessible action menu. `trigger` is cloned with click / keyboard handlers and ARIA attributes
 * (use a Button, IconButton or native <button>). Arrow keys, Home / End, Escape and Tab work as
 * expected; the menu closes on outside click and after an item is chosen.
 *
 * @example
 * <DropdownMenu align="end" trigger={<IconButton icon={MoreHorizontal} label="Task actions" />}>
 *   <DropdownItem icon={Pencil} onClick={edit}>Edit</DropdownItem>
 *   <DropdownSeparator />
 *   <DropdownItem icon={Trash2} danger onClick={remove}>Delete</DropdownItem>
 * </DropdownMenu>
 */
export function DropdownMenu({
  trigger,
  align = 'start',
  side = 'bottom',
  width = 'w-56',
  className,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState('container');
  const anchorRef = useRef(null);
  const menuId = useId();

  const triggerRef = trigger.ref;
  const mergedRef = useMemo(() => mergeRefs(anchorRef, triggerRef), [triggerRef]);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) anchorRef.current?.focus({ preventScroll: true });
  }, []);

  const contextValue = useMemo(() => ({ close }), [close]);

  const triggerProps = trigger.props;
  const triggerElement = cloneElement(trigger, {
    ref: mergedRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event) => {
      triggerProps.onClick?.(event);
      if (event.defaultPrevented) return;
      anchorRef.current = event.currentTarget;
      // detail === 0 -> activated with the keyboard: move focus straight to the first item.
      setInitialFocus(event.detail === 0 ? 'first' : 'container');
      setOpen((current) => !current);
    },
    onKeyDown: (event) => {
      triggerProps.onKeyDown?.(event);
      if (event.defaultPrevented || open) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        anchorRef.current = event.currentTarget;
        setInitialFocus(event.key === 'ArrowUp' ? 'last' : 'first');
        setOpen(true);
      }
    },
  });

  const handleMenuKeyDown = (event) => {
    const items = Array.from(event.currentTarget.querySelectorAll(ITEM_SELECTOR));
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);
    let next;
    switch (event.key) {
      case 'ArrowDown':
        next = items[index === -1 ? 0 : (index + 1) % items.length];
        break;
      case 'ArrowUp':
        next = items[index === -1 ? items.length - 1 : (index - 1 + items.length) % items.length];
        break;
      case 'Home':
        next = items[0];
        break;
      case 'End':
        next = items[items.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    next.focus();
  };

  return (
    <>
      {triggerElement}
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={align}
        side={side}
        role="menu"
        id={menuId}
        aria-orientation="vertical"
        initialFocus={initialFocus}
        closeOnTab
        onKeyDown={handleMenuKeyDown}
        className={cn('max-w-[calc(100vw-1rem)] p-1', width, className)}
      >
        <DropdownContext.Provider value={contextValue}>{children}</DropdownContext.Provider>
      </Popover>
    </>
  );
}

/**
 * Menu entry. Renders a <button>, or a router <Link> when `to` is given (or a custom `as`).
 */
export function DropdownItem({
  icon: Icon,
  onClick,
  danger = false,
  disabled = false,
  as,
  to,
  className,
  children,
  ...props
}) {
  const menu = useContext(DropdownContext);
  const Component = as ?? (to ? Link : 'button');
  const isNativeButton = Component === 'button';

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    menu?.close({ restoreFocus: !to });
  };

  return (
    <Component
      role="menuitem"
      tabIndex={-1}
      to={to}
      type={isNativeButton ? 'button' : undefined}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      className={cn(
        'group flex h-8 w-full select-none items-center gap-2.5 rounded-[5px] px-2 text-left',
        'text-[13px] outline-none transition-colors duration-100 touch:h-10',
        danger
          ? 'text-danger hover:bg-danger/[0.08] focus:bg-danger/[0.08]'
          : 'text-fg hover:bg-surface-hover focus:bg-surface-hover',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            danger
              ? 'text-current'
              : 'text-fg-subtle group-hover:text-fg-muted group-focus:text-fg-muted',
          )}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Component>
  );
}

export function DropdownSeparator({ className }) {
  return <div role="separator" className={cn('-mx-1 my-1 h-px bg-line dark:bg-line-strong', className)} />;
}

/** Non-interactive heading / info block inside a menu. */
export function DropdownLabel({ className, children }) {
  return (
    <div
      role="presentation"
      className={cn(
        'px-2 pb-1 pt-2 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-fg-subtle',
        className,
      )}
    >
      {children}
    </div>
  );
}
