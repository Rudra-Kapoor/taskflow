import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';

/** "Page 2 of 5 · 93 tasks" with Previous / Next buttons. Hidden when there is nothing to page. */
export function Pagination({ page, totalPages, total, noun = 'item', onPageChange, className }) {
  if (!total) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5',
        className,
      )}
    >
      <p className="text-xs text-fg-muted">
        Page <span className="font-semibold text-fg">{page}</span> of{' '}
        <span className="font-semibold text-fg">{Math.max(totalPages, 1)}</span>
        <span className="mx-1.5 text-fg-subtle" aria-hidden="true">
          ·
        </span>
        {pluralize(total, noun)}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconRight={ChevronRight}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
