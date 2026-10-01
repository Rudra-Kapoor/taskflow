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

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      dismissible={!loading}
      hideCloseButton
      ariaLabel={typeof title === 'string' ? title : 'Confirm action'}
      bodyClassName="pb-6 pt-6"
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
      <div className="min-w-0">
        <h2 className="font-display text-[28px] font-normal leading-[1.1] tracking-[-0.005em] text-fg">
          {title}
        </h2>
        {description && (
          <div className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</div>
        )}
      </div>
    </Modal>
  );
}
