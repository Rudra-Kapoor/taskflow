import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Task label as an outlined tag: hairline border, muted text (the same everywhere). */
export function LabelChip({ label, onRemove, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-0.5 rounded-sm border border-line-strong',
        'bg-transparent text-[11px] font-medium leading-none text-fg-muted',
        onRemove ? 'pl-1.5 pr-0.5' : 'px-1.5',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(label)}
          aria-label={`Remove label ${label}`}
          className={cn(
            'relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm',
            'text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            // A 36px touch target around the small icon.
            'touch:after:absolute touch:after:-inset-2.5',
          )}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
