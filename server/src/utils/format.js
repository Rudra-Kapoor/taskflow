/** Human-readable task key, e.g. `WEB-12`. */
export const formatTaskKey = (projectKey, number) => `${projectKey}-${number}`;

/** Collapses whitespace and shortens `text` to at most `max` characters (adding an ellipsis). */
export const truncate = (text, max) => {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};
