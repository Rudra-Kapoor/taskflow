import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { Kbd, Spinner } from '@/components/ui';
import { useAutoResize } from '@/hooks/board/useAutoResize';
import { useCreateTask } from '@/hooks/queries/tasks';

const MAX_TITLE_LENGTH = 200;

/**
 * "+ Add task" at the bottom of a column. Enter creates the task in that column and keeps the
 * field open for rapid entry; Escape (or leaving it empty) closes it.
 */
export function QuickAddTask({ projectId, status, statusLabel, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const textareaRef = useRef(null);
  const { mutateAsync: createTask } = useCreateTask();
  useAutoResize(textareaRef, title, 160);

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  const submit = async () => {
    const value = title.trim();
    if (!value) return;
    setTitle('');
    setPendingCount((count) => count + 1);
    try {
      const task = await createTask({ projectId, data: { title: value, status } });
      onCreated?.(task);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create the task'));
      // Give the text back so nothing typed is lost.
      setTitle((current) => current || value);
    } finally {
      setPendingCount((count) => count - 1);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring flex h-8 w-full shrink-0 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg dark:hover:bg-surface"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add task
      </button>
    );
  }

  return (
    <div className="animate-fade-in rounded-lg border border-brand-400/70 bg-surface p-2.5 shadow-sm ring-[3px] ring-brand-500/15 dark:bg-surface-hover">
      <textarea
        ref={textareaRef}
        autoFocus
        rows={1}
        value={title}
        maxLength={MAX_TITLE_LENGTH}
        onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) close();
        }}
        placeholder="What needs to be done?"
        aria-label={`New task title in ${statusLabel}`}
        className="block w-full resize-none bg-transparent text-sm leading-snug text-fg placeholder:text-fg-subtle focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-2xs text-fg-subtle">
        <span className="flex items-center gap-1">
          <Kbd>Enter</Kbd> to add
          <span aria-hidden="true" className="px-0.5">
            ·
          </span>
          <Kbd>Esc</Kbd> to close
        </span>
        {pendingCount > 0 && <Spinner size="xs" className="text-brand-500" label="Creating task" />}
      </div>
    </div>
  );
}
