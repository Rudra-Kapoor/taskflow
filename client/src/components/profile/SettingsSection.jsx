import { cn } from '@/lib/cn';

/**
 * Preferences row: the section label and its explanation on the left (on top on phones), the
 * controls on the right. Sections are divided by hairlines, not boxed.
 */
export function SettingsSection({ title, description, children }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.005em] text-fg">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </section>
  );
}

/** Controls of a section, with an optional row of actions (save, discard) at the end. */
export function SettingsPanel({ as: Component = 'div', footer, className, children, ...props }) {
  return (
    <Component className={cn('min-w-0', className)} {...props}>
      <div className="space-y-5">{children}</div>
      {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
    </Component>
  );
}
