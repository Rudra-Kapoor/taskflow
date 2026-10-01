import { cn } from '@/lib/cn';

/** Keyboard key hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd>. */
export function Kbd({ className, children }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 select-none items-center justify-center rounded-sm border',
        'border-line-strong bg-surface px-1 font-mono text-[11px] font-normal leading-none',
        'text-fg-muted shadow-[0_1px_0_rgb(var(--color-line-strong))]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
