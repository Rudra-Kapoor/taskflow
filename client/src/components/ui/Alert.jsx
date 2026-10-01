import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    box: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
  warning: {
    icon: AlertTriangle,
    box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  success: {
    icon: CheckCircle2,
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  info: {
    icon: Info,
    box: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-200',
    iconColor: 'text-brand-500 dark:text-brand-400',
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
        'flex animate-fade-in gap-3 rounded-lg border px-3.5 py-3 text-sm',
        styles.box,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', styles.iconColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}
