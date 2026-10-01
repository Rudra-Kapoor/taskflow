import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Confirmation prompt for destructive or important actions. Cannot be dismissed while `loading`.
 * @example
 * <ConfirmDialog open={open} onClose={close} onConfirm={remove} loading={isPending}
 *   title="Delete task?" description="This cannot be undone." />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      dismissible={!loading}
      hideCloseButton
      ariaLabel={typeof title === 'string' ? title : 'Confirm action'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            isDanger
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
              : 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
          {description && <div className="mt-1.5 text-sm text-fg-muted">{description}</div>}
        </div>
      </div>
    </Modal>
  );
}
