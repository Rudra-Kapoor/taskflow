import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Dashboard panel: title, optional description and header action, then its content. */
export function DashboardCard({ title, description, action, className, children }) {
  return (
    <Card padding={false} className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </div>
        {action && <div className="-mr-1 -mt-1 shrink-0">{action}</div>}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">{children}</div>
    </Card>
  );
}
