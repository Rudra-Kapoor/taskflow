import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kbd, SearchInput } from '@/components/ui';
import { cn } from '@/lib/cn';
import { isApplePlatform } from '@/lib/dom';

const SHORTCUT_LABEL = isApplePlatform() ? '⌘K' : 'Ctrl K';

/**
 * Global task search. Submitting navigates to `/tasks?search=<q>` (keeping the other task filters
 * when already on that page). With `enableShortcut`, Ctrl/Cmd + K focuses the field.
 */
export function GlobalSearch({ className, autoFocus = false, enableShortcut = false, onDone }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const onTasksPage = location.pathname === '/tasks';
  const urlSearch = onTasksPage ? (new URLSearchParams(location.search).get('search') ?? '') : '';
  const [term, setTerm] = useState(urlSearch);

  // Mirror the URL while the task list is open; start fresh elsewhere.
  useEffect(() => {
    setTerm(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (!enableShortcut) return undefined;
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcut]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = term.trim();
    const params = new URLSearchParams(onTasksPage ? location.search : '');
    if (query) params.set('search', query);
    else params.delete('search');
    params.delete('page');
    params.delete('task');
    const search = params.toString();
    navigate({ pathname: '/tasks', search: search ? `?${search}` : '' });
    inputRef.current?.blur();
    onDone?.();
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={className}>
      <SearchInput
        value={term}
        onChange={setTerm}
        inputRef={inputRef}
        autoFocus={autoFocus}
        placeholder="Search tasks"
        aria-label="Search tasks"
        enterKeyHint="search"
        // Understated: paper-toned until hovered or focused, then a regular field.
        inputClassName={cn(
          'h-8 rounded-md border-line bg-surface/50 text-[13px] shadow-none touch:h-10',
          'hover:border-line-strong focus:bg-surface dark:bg-surface/40 dark:focus:bg-surface',
        )}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !term) {
            inputRef.current?.blur();
            onDone?.();
          }
        }}
        trailing={
          enableShortcut && (
            <Kbd className="h-[18px] border-line bg-transparent px-1.5 font-mono text-[11px] font-normal text-fg-subtle shadow-none">
              {SHORTCUT_LABEL}
            </Kbd>
          )
        }
      />
    </form>
  );
}
