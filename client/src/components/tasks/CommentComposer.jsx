import { useRef, useState } from 'react';
import { Avatar, Button, Kbd } from '@/components/ui';
import { useAutoResize } from '@/hooks/board/useAutoResize';
import { isApplePlatform } from '@/lib/dom';

export const MAX_COMMENT_LENGTH = 2000;

/**
 * New comment box: grows with its content, Ctrl/Cmd+Enter sends. Escape leaves a non-empty
 * draft (instead of closing the dialog). `onSubmit(body)` resolves to `true` on success.
 */
export function CommentComposer({ user, onSubmit }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  useAutoResize(textareaRef, body, 260);
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || sending) return;
    setSending(true);
    const sent = await onSubmit(trimmed);
    setSending(false);
    if (sent) setBody('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape' && body) {
      event.stopPropagation();
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex gap-3">
      <Avatar user={user} size="sm" className="mt-2 hidden xs:inline-flex" />
      <div className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-fg/60 focus-within:ring-2 focus-within:ring-brand-500/20">
        <textarea
          ref={textareaRef}
          rows={2}
          value={body}
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          className="block w-full resize-none rounded-t-lg bg-transparent px-3.5 pt-3 text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
          <span className="hidden items-center gap-1 text-xs text-fg-muted sm:flex">
            <Kbd>{isApplePlatform() ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>Enter</Kbd>
            <span className="ml-1">to send</span>
          </span>
          <Button
            size="sm"
            loading={sending}
            disabled={!trimmed}
            onClick={submit}
            className="ml-auto"
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
