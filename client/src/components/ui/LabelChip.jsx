import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pickFromPalette } from '@/lib/format';

const PALETTES = [
  'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20',
  'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20',
  'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  'bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-400/10 dark:text-pink-300 dark:ring-pink-400/20',
  'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20',
  'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/20',
  'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/20',
  'bg-lime-50 text-lime-800 ring-lime-600/20 dark:bg-lime-400/10 dark:text-lime-300 dark:ring-lime-400/20',
  'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:ring-fuchsia-400/20',
];

/** Task label pill; the colour is derived from the label text so it is stable everywhere. */
export function LabelChip({ label, onRemove, className }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-full items-center gap-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset',
        onRemove ? 'pl-1.5 pr-0.5' : 'px-1.5',
        pickFromPalette(String(label).toLowerCase(), PALETTES),
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
            'relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-70',
            'transition hover:bg-black/5 hover:opacity-100 focus-visible:opacity-100',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current',
            'dark:hover:bg-white/10',
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
