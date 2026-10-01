import { useRef, useState } from 'react';
import { Kbd } from '@/components/ui';
import { useAutoResize } from '@/hooks/board/useAutoResize';
import { cn } from '@/lib/cn';

const MAX_TITLE_LENGTH = 200;
const TITLE_CLASSES = 'text-lg font-semibold leading-snug tracking-tight text-fg sm:text-xl';

/**
 * Inline title editing: click to edit, Enter or leaving the field saves, Escape cancels.
 * Only a real edit is saved: the draft is compared with the title as it was when editing started,
 * so leaving an untouched field never overwrites a newer title from a teammate (which is pointed
 * out while editing). An emptied title is never saved.
 */
export function TaskTitleEditor({ title, readOnly, onSave }) {
  const [edit, setEdit] = useState(null); // { draft, initial } while editing
  const cancelRef = useRef(false);
  const textareaRef = useRef(null);
  useAutoResize(textareaRef, edit?.draft ?? null, 240);

  const changedElsewhere = Boolean(edit) && title !== edit.initial;

  // Every way out of the field (Enter, Escape, clicking elsewhere) ends here exactly once.
  const finish = () => {
    const session = edit;
    setEdit(null);
    if (cancelRef.current || !session) {
      cancelRef.current = false;
      return;
    }
    const value = session.draft.trim();
    if (value && value !== session.initial.trim()) onSave(value);
  };

  if (readOnly) {
    return <h2 className={cn(TITLE_CLASSES, 'break-words')}>{title}</h2>;
  }

  if (!edit) {
    return (
      <h2 className={TITLE_CLASSES}>
        <button
          type="button"
          data-autofocus
          onClick={() => setEdit({ draft: title, initial: title })}
          title="Click to edit the title"
          className="focus-ring -mx-2 block w-[calc(100%+1rem)] break-words rounded-lg px-2 py-1 text-left transition-colors hover:bg-surface-hover"
        >
          {title}
        </button>
      </h2>
    );
  }

  return (
    <div className="-mx-2">
      <textarea
        ref={textareaRef}
        autoFocus
        rows={1}
        value={edit.draft}
        maxLength={MAX_TITLE_LENGTH}
        aria-label="Task title"
        aria-describedby={changedElsewhere ? 'task-title-conflict' : undefined}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          const draft = event.target.value.replace(/\n/g, ' ');
          setEdit((current) => ({ ...current, draft }));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelRef.current = true;
            event.currentTarget.blur();
          }
        }}
        onBlur={finish}
        className={cn(
          TITLE_CLASSES,
          'block w-full resize-none rounded-lg border border-brand-500 bg-surface px-2 py-1 shadow-xs',
          'ring-[3px] ring-brand-500/20 focus:outline-none',
        )}
      />
      {changedElsewhere && (
        <p
          id="task-title-conflict"
          className="mt-1.5 px-2 text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          Someone else renamed this task to “{title}”. Saving replaces it with your version.
        </p>
      )}
      <p className="mt-1.5 flex items-center gap-1 px-2 text-xs text-fg-muted">
        <Kbd>Enter</Kbd> to save
        <span aria-hidden="true" className="px-0.5">
          ·
        </span>
        <Kbd>Esc</Kbd> to cancel
        <span className="ml-auto tabular-nums">
          {edit.draft.length}/{MAX_TITLE_LENGTH}
        </span>
      </p>
    </div>
  );
}
