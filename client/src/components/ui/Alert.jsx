import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Hairline box; the tone shows in the icon and border, the copy stays ink. */
const VARIANTS = {
  error: {
    icon: AlertCircle,
    box: 'border-danger/30 bg-danger/[0.04] dark:bg-danger/[0.06]',
    iconColor: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    box: 'border-warning/35 bg-warning/[0.05] dark:bg-warning/[0.06]',
    iconColor: 'text-warning',
  },
  success: {
    icon: CheckCircle2,
    box: 'border-success/30 bg-success/[0.04] dark:bg-success/[0.06]',
    iconColor: 'text-success',
  },
  info: {
    icon: Info,
    box: 'border-line-strong bg-surface',
    iconColor: 'text-fg-muted',
  },
};

/** Inline message box (form errors, notices). `variant` = error | warning | success | info. */
export function Alert({ variant = 'info', title, className, children }) {
  const styles = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = styles.icon;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex animate-fade-in gap-2.5 rounded-md border px-3.5 py-3 text-[13px] leading-5 text-fg',
        styles.box,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', styles.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5 text-fg-muted')}>{children}</div>}
      </div>
    </div>
  );
}
