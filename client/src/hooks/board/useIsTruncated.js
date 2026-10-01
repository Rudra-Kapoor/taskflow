import { useLayoutEffect, useState } from 'react';

/**
 * True while the element's content is cut off (e.g. by `line-clamp` or a max height), so a
 * "Show more" toggle is only offered when it does something. Re-measured when `content` changes
 * and whenever the element is resized.
 */
export function useIsTruncated(ref, content) {
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      setTruncated(
        element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1,
      );
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [ref, content]);

  return truncated;
}
