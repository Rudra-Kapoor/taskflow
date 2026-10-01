import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kbd, SearchInput } from '@/components/ui';
import { isApplePlatform } from '@/lib/dom';

const SHORTCUT_LABEL = isApplePlatform() ? '⌘' : 'Ctrl';

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
        placeholder="Search tasks…"
        aria-label="Search tasks"
        enterKeyHint="search"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !term) {
            inputRef.current?.blur();
            onDone?.();
          }
        }}
        trailing={
          enableShortcut && (
            <>
              <Kbd>{SHORTCUT_LABEL}</Kbd>
              <Kbd>K</Kbd>
            </>
          )
        }
      />
    </form>
  );
}
