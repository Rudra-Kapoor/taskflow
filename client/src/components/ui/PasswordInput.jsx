import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from './Input';

/** Password field with a lock icon and a show / hide toggle. Accepts every `Input` prop. */
export const PasswordInput = forwardRef(function PasswordInput({ icon = Lock, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;
  const toggleLabel = visible ? 'Hide password' : 'Show password';

  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      icon={icon}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      }
      {...props}
    />
  );
});
