import { isValidElement } from 'react';
import { cn } from '@/lib/cn';
import { renderIcon } from './renderIcon';

/**
 * Page title block: optional mono `eyebrow`, serif display title, description and right-aligned
 * actions. `icon`: a ready-made element (e.g. a team avatar) sits beside the title; a lucide
 * component is drawn small in the eyebrow row (only when there is an eyebrow - no icon tiles).
 * `children` render as an extra row below (filters, tabs, …).
 */
export function PageHeader({ title, description, actions, icon, eyebrow, className, children }) {
  const iconElement = isValidElement(icon) ? icon : null;

  return (
    <div className={cn('mb-6 flex flex-col gap-5 sm:mb-8', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {iconElement && <div className="hidden h-11 w-11 shrink-0 xs:flex">{iconElement}</div>}
          <div className="min-w-0">
            {eyebrow && (
              <p className="eyebrow mb-2.5 flex items-center gap-1.5">
                {!iconElement && renderIcon(icon, 'h-3.5 w-3.5 shrink-0')}
                <span className="truncate">{eyebrow}</span>
              </p>
            )}
            <h1 className="title-display truncate pb-[0.12em]">{title}</h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
