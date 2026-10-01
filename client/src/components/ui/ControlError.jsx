/** Error message rendered under a standalone control (inside a FormField the field renders it). */
export function ControlError({ id, children }) {
  return (
    <p
      id={id}
      className="mt-1.5 animate-fade-in text-xs font-medium text-rose-600 dark:text-rose-400"
    >
      {children}
    </p>
  );
}
