import { cn } from '@/lib/cn';

/** Keyboard key hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd>. */
export function Kbd({ className, children }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 select-none items-center justify-center rounded-[5px] border',
        'border-line-strong bg-surface-muted px-1.5 font-sans text-[11px] font-medium leading-none',
        'text-fg-muted shadow-[0_1px_0_rgb(var(--color-line-strong))]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
