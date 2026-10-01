import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Settings block: title + explanation on the left (top on mobile), the panel on the right. */
export function SettingsSection({ title, description, children }) {
  return (
    <section className="grid gap-4 lg:grid-cols-3 lg:gap-10">
      <div className="lg:pt-4">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0 lg:col-span-2">{children}</div>
    </section>
  );
}

/** Form card with a footer bar for its actions (like a modal footer). */
export function SettingsCard({ as = 'div', footer, className, children, ...props }) {
  return (
    <Card as={as} padding={false} className={cn('overflow-hidden', className)} {...props}>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted/50 px-5 py-3.5 sm:px-6">
          {footer}
        </div>
      )}
    </Card>
  );
}
