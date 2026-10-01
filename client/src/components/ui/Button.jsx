import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

const VARIANTS = {
  // Ink: near-black on paper, off-white in dark mode.
  primary:
    'border-transparent bg-fg text-canvas hover:bg-fg/85 active:bg-fg/75 dark:hover:bg-fg/90',
  secondary:
    'border-line-strong bg-surface text-fg hover:border-fg-subtle/50 hover:bg-surface-hover ' +
    'active:bg-surface-muted',
  ghost:
    'border-transparent bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg ' +
    'active:bg-surface-muted',
  danger:
    'border-transparent bg-[#B42318] text-white hover:bg-[#9A1D14] active:bg-[#82170F] ' +
    'dark:bg-[#C4321F] dark:hover:bg-[#AD2A19]',
  outline:
    'border-fg/25 bg-transparent text-fg hover:border-fg/45 hover:bg-surface-hover ' +
    'active:bg-surface-muted',
  // Vermilion: reserved for the single most important call to action of a screen (auth).
  accent:
    'border-transparent bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 ' +
    'dark:bg-brand-500 dark:text-[#191814] dark:hover:bg-brand-400 dark:active:bg-brand-300',
};

/** Height / radius / font per size; `pad` vs `square` depends on whether there is a label. */
const SIZES = {
  xs: { base: 'h-7 gap-1 rounded-md text-xs', pad: 'px-2', square: 'w-7', icon: 'h-3.5 w-3.5' },
  sm: { base: 'h-8 gap-1.5 rounded-md text-[13px]', pad: 'px-2.5', square: 'w-8', icon: 'h-4 w-4' },
  md: { base: 'h-9 gap-2 rounded-md text-[13px]', pad: 'px-3.5', square: 'w-9', icon: 'h-4 w-4' },
  lg: {
    base: 'h-10 gap-2 rounded-md text-sm',
    pad: 'px-4',
    square: 'w-10',
    icon: 'h-4 w-4',
  },
};

const SPINNER_SIZES = { xs: 'xs', sm: 'sm', md: 'sm', lg: 'md' };

/**
 * Primary action component.
 * @example <Button icon={Plus} onClick={create}>New task</Button>
 * @example <Button as={Link} to="/projects" variant="secondary">All projects</Button>
 */
export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    fullWidth = false,
    as: Component = 'button',
    type,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  const isNativeButton = Component === 'button';
  const isDisabled = Boolean(disabled || loading);
  const sizing = SIZES[size] ?? SIZES.md;
  const iconOnly = !children && (Icon || loading) && !IconRight;

  return (
    <Component
      ref={ref}
      type={isNativeButton ? (type ?? 'button') : type}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-disabled={!isNativeButton && isDisabled ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap',
        'border font-medium tracking-[-0.005em]',
        'transition-[color,background-color,border-color,box-shadow,transform]',
        'duration-150 active:translate-y-px disabled:pointer-events-none',
        // A loading button stays vivid (the spinner tells the story); disabled ones fade.
        loading ? 'disabled:opacity-80' : 'disabled:opacity-50',
        VARIANTS[variant] ?? VARIANTS.primary,
        sizing.base,
        iconOnly ? sizing.square : sizing.pad,
        fullWidth && 'w-full',
        !isNativeButton && isDisabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={SPINNER_SIZES[size] ?? 'sm'} />
      ) : (
        Icon && <Icon className={cn('shrink-0', sizing.icon)} aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight className={cn('shrink-0', sizing.icon)} aria-hidden="true" />}
    </Component>
  );
});
