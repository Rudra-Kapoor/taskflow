import { useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Avatar, Button, IconButton, TimeAgo } from '@/components/ui';
import { useAutoResize } from '@/hooks/board/useAutoResize';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { MAX_COMMENT_LENGTH } from './CommentComposer';

/**
 * One comment: author, relative time (full date on hover), "edited" marker and the body.
 * Authors can edit inline (Ctrl/Cmd+Enter saves, Escape cancels); delete is confirmed by the
 * parent. Actions show on hover / focus with a mouse and are always visible on touch screens.
 */
export function CommentItem({ comment, isOwn, canEdit, canDelete, onUpdate, onRequestDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);
  useAutoResize(textareaRef, editing ? draft : null, 300);

  const startEditing = () => {
    setDraft(comment.body);
    setEditing(true);
  };

  const save = async () => {
    const value = draft.trim();
    if (!value) return;
    if (value === comment.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const saved = await onUpdate(comment._id, value);
    setSaving(false);
    if (saved) setEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setEditing(false);
    }
  };

  const authorName = comment.author?.name ?? 'Former member';

  return (
    <li id={`comment-${comment._id}`} className="group/comment flex scroll-mt-20 gap-3">
      <Avatar user={comment.author ?? null} size="md" decorative className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-fg">{authorName}</span>
          {isOwn && (
            <span className="rounded bg-surface-muted px-1 py-px text-2xs font-medium uppercase tracking-wide text-fg-muted dark:bg-surface-hover">
              You
            </span>
          )}
          <TimeAgo date={comment.createdAt} className="text-xs text-fg-muted" />
          {comment.editedAt && (
            <span
              className="text-xs text-fg-muted"
              title={`Edited ${formatDateTime(comment.editedAt)}`}
            >
              (edited)
            </span>
          )}
          {(canEdit || canDelete) && !editing && (
            <span
              className={cn(
                'ml-auto flex items-center gap-0.5 transition-opacity',
                '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/comment:opacity-100',
                'group-focus-within/comment:opacity-100',
              )}
            >
              {canEdit && (
                <IconButton
                  icon={Pencil}
                  label="Edit comment"
                  size="xs"
                  onClick={startEditing}
                  className="touch:h-9 touch:w-9"
                />
              )}
              {canDelete && (
                <IconButton
                  icon={Trash2}
                  label="Delete comment"
                  size="xs"
                  variant="danger"
                  onClick={() => onRequestDelete(comment)}
                  className="touch:h-9 touch:w-9"
                />
              )}
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-1.5">
            <textarea
              ref={textareaRef}
              autoFocus
              rows={2}
              value={draft}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Edit comment"
              className="input-base resize-none py-2 leading-relaxed"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={save} loading={saving} disabled={!draft.trim()}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm bg-surface-muted/80 px-3.5 py-2.5 text-sm leading-relaxed text-fg [overflow-wrap:anywhere] dark:bg-surface-hover/70">
            {comment.body}
          </div>
        )}
      </div>
    </li>
  );
}
