import { useEffect } from 'react';
import { APP_NAME } from '@/lib/constants';

/**
 * Sets the browser tab title to "<title> · TaskFlow" while the page is mounted, then restores
 * the previous title (pages without the hook keep the default one from index.html).
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
