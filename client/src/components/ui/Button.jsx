import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

const VARIANTS = {
  primary:
    'border-transparent bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 ' +
    'active:bg-brand-800 dark:shadow-none dark:hover:bg-brand-500 dark:active:bg-brand-600',
  secondary:
    'border-line-strong bg-surface text-fg shadow-xs hover:bg-surface-hover active:bg-surface-muted',
  ghost:
    'border-transparent bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg ' +
    'active:bg-surface-muted',
  danger:
    'border-transparent bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 ' +
    'active:bg-rose-800 dark:shadow-none dark:hover:bg-rose-500',
  outline:
    'border-brand-300 bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 ' +
    'dark:border-brand-400/40 dark:text-brand-300 dark:hover:bg-brand-500/10 ' +
    'dark:active:bg-brand-500/15',
};

/** Height / radius / font per size; `pad` vs `square` depends on whether there is a label. */
const SIZES = {
  xs: { base: 'h-7 gap-1 rounded-md text-xs', pad: 'px-2', square: 'w-7', icon: 'h-3.5 w-3.5' },
  sm: { base: 'h-8 gap-1.5 rounded-lg text-[13px]', pad: 'px-3', square: 'w-8', icon: 'h-4 w-4' },
  md: { base: 'h-9 gap-2 rounded-lg text-sm', pad: 'px-3.5', square: 'w-9', icon: 'h-4 w-4' },
  lg: {
    base: 'h-11 gap-2 rounded-lg text-[15px]',
    pad: 'px-5',
    square: 'w-11',
    icon: 'h-[18px] w-[18px]',
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
        'border font-medium transition-[color,background-color,border-color,box-shadow,transform]',
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
