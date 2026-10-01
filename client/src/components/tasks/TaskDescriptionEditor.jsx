import { useRef, useState } from 'react';
import { AlignLeft, ChevronDown, Pencil } from 'lucide-react';
import { Button, Kbd } from '@/components/ui';
import { useAutoResize } from '@/hooks/board/useAutoResize';
import { useIsTruncated } from '@/hooks/board/useIsTruncated';
import { cn } from '@/lib/cn';
import { isApplePlatform } from '@/lib/dom';
import { formatNumber } from '@/lib/format';

const MAX_DESCRIPTION_LENGTH = 5000;

/** Long descriptions start collapsed to about ten lines, with a fade and "Show more". */
function DescriptionText({ text, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef(null);
  const truncated = useIsTruncated(textRef, text);
  const collapsed = !expanded && truncated;
  const editable = Boolean(onEdit);

  return (
    <div>
      <div
        ref={textRef}
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? 'Edit description' : undefined}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (!editable || event.key !== 'Enter') return;
          event.preventDefault();
          onEdit();
        }}
        className={cn(
          'whitespace-pre-wrap break-words text-sm leading-relaxed text-fg',
          !expanded && 'max-h-60 overflow-hidden',
          // Fades the last lines out (works on any background, hover included).
          collapsed && '[mask-image:linear-gradient(to_bottom,#000_calc(100%-4rem),transparent)]',
          editable &&
            'focus-ring -mx-2 cursor-text rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover/70',
        )}
      >
        {text}
      </div>
      {(truncated || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="focus-ring mt-1 inline-flex h-8 items-center gap-1 rounded-md px-1 text-xs font-medium text-brand-700 hover:underline touch:h-9 dark:text-brand-300"
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

/**
 * Task description: plain text (line breaks kept) that turns into a textarea on click / "Edit".
 * Save with the button or Ctrl/Cmd+Enter; Escape or Cancel discards the draft. Only a real edit
 * is saved (compared with the description when editing started), so a teammate's newer text is
 * never replaced by an untouched draft.
 */
export function TaskDescriptionEditor({ description, readOnly, onSave }) {
  const [edit, setEdit] = useState(null); // { draft, initial } while editing
  const textareaRef = useRef(null);
  useAutoResize(textareaRef, edit?.draft ?? null, 480);
  const text = description?.trim() ?? '';
  const changedElsewhere = Boolean(edit) && (description ?? '') !== edit.initial;

  const startEditing = () => {
    // Selecting text to copy it should not switch to edit mode.
    if (window.getSelection()?.toString()) return;
    setEdit({ draft: description ?? '', initial: description ?? '' });
  };

  const save = () => {
    const value = edit.draft.trim();
    const unchanged = value === edit.initial.trim();
    setEdit(null);
    if (!unchanged) onSave(value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setEdit(null);
    }
  };

  let body;
  if (edit) {
    body = (
      <div>
        <textarea
          ref={textareaRef}
          autoFocus
          rows={5}
          value={edit.draft}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(event) => {
            const draft = event.target.value;
            setEdit((current) => ({ ...current, draft }));
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add a more detailed description…"
          aria-label="Task description"
          aria-describedby={changedElsewhere ? 'task-description-conflict' : undefined}
          className="input-base min-h-[8rem] resize-none py-2.5 leading-relaxed"
        />
        {changedElsewhere && (
          <p
            id="task-description-conflict"
            className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300"
          >
            Someone else changed this description while you were editing. Saving replaces their
            version with yours.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>
            Cancel
          </Button>
          <span className="ml-auto flex items-center gap-1 text-xs text-fg-muted">
            <Kbd>{isApplePlatform() ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>Enter</Kbd>
            <span className="ml-1 tabular-nums">
              {formatNumber(edit.draft.length)}/{formatNumber(MAX_DESCRIPTION_LENGTH)}
            </span>
          </span>
        </div>
      </div>
    );
  } else if (text) {
    body = <DescriptionText text={text} onEdit={readOnly ? undefined : startEditing} />;
  } else {
    body = readOnly ? (
      <p className="text-sm text-fg-muted">No description.</p>
    ) : (
      <button
        type="button"
        onClick={startEditing}
        className="focus-ring w-full rounded-lg border border-dashed border-line-strong px-3.5 py-3.5 text-left text-sm text-fg-muted transition-colors hover:border-brand-300 hover:bg-surface-hover/50 hover:text-fg dark:hover:border-brand-400/40"
      >
        Add a more detailed description…
      </button>
    );
  }

  return (
    <section aria-labelledby="task-description-heading">
      <div className="mb-2 flex h-7 items-center justify-between gap-2">
        <h3
          id="task-description-heading"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted"
        >
          <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Description
        </h3>
        {!readOnly && !edit && text && (
          <Button variant="ghost" size="xs" icon={Pencil} onClick={startEditing}>
            Edit
          </Button>
        )}
      </div>
      <div className={cn(edit && 'animate-fade-in')}>{body}</div>
    </section>
  );
}
