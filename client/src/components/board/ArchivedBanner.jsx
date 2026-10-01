import { ArchiveRestore } from 'lucide-react';
import { Alert, Button } from '@/components/ui';

/** Read-only notice for archived projects, with a restore shortcut for managers. */
export function ArchivedBanner({ canRestore, onRestore, restoring }) {
  return (
    <Alert variant="warning" title="This project is archived and read-only">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span>
          {canRestore
            ? 'Restore it to add, edit or move tasks again.'
            : 'Tasks can’t be changed until a team owner or admin restores it.'}
        </span>
        {canRestore && (
          <Button
            size="sm"
            variant="secondary"
            icon={ArchiveRestore}
            loading={restoring}
            onClick={onRestore}
          >
            Restore project
          </Button>
        )}
      </div>
    </Alert>
  );
}
