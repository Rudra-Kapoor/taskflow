import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { Button, FormField, Input } from '@/components/ui';
import { useUpdateProfile } from '@/hooks/queries/auth';
import { cn } from '@/lib/cn';
import { AVATAR_COLORS, COLOR_NAMES, calmColor } from '@/lib/constants';
import { SettingsPanel } from './SettingsSection';

/** Mirrors the API rules: name 2-60 characters, title up to 80, colour `#RRGGBB`. */
const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  title: z.string().trim().max(80, 'Title must be at most 80 characters'),
  avatarColor: z.string().regex(/^#[\da-f]{6}$/i, 'Pick a colour'),
});

const toFormValues = (user) => ({
  name: user?.name ?? '',
  title: user?.title ?? '',
  avatarColor: user?.avatarColor ?? AVATAR_COLORS[0],
});

/**
 * Name, job title and avatar colour. `onPreviewChange(values)` reports unsaved edits so the
 * page header can preview them live.
 */
export function ProfileForm({ user, onPreviewChange }) {
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
    mode: 'onTouched',
  });

  useEffect(() => {
    const subscription = watch((values) => onPreviewChange?.(values));
    return () => subscription.unsubscribe();
  }, [watch, onPreviewChange]);

  const avatarColor = watch('avatarColor');
  const colors = AVATAR_COLORS.includes(user?.avatarColor)
    ? AVATAR_COLORS
    : [user?.avatarColor, ...AVATAR_COLORS].filter(Boolean);

  const onSubmit = async (values) => {
    try {
      const updated = await updateProfile.mutateAsync(values);
      reset(toFormValues(updated));
      toast.success('Profile updated');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        toast.error(getErrorMessage(error, 'Could not update your profile.'));
      }
    }
  };

  return (
    <SettingsPanel
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => reset(toFormValues(user))}
            disabled={!isDirty || isSubmitting}
          >
            Discard
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" error={errors.name?.message} required>
          <Input autoComplete="name" maxLength={60} {...register('name')} />
        </FormField>
        <FormField label="Job title" error={errors.title?.message} hint="Optional">
          <Input
            placeholder="e.g. Product Designer"
            autoComplete="organization-title"
            maxLength={80}
            {...register('title')}
          />
        </FormField>
      </div>

      <FormField label="Email" hint="Your sign-in email can’t be changed.">
        <Input value={user?.email ?? ''} readOnly disabled className="font-mono text-[13px]" />
      </FormField>

      <div className="space-y-2">
        <p className="text-[13px] font-medium text-fg">Avatar colour</p>
        <AvatarColorPicker
          value={avatarColor}
          colors={colors}
          aria-label="Avatar colour"
          onChange={(value) => setValue('avatarColor', value, { shouldDirty: true })}
        />
      </div>
    </SettingsPanel>
  );
}

const ARROW_STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Avatar colour swatches as a radio group (one tab stop; arrow keys, Home and End move and
 * select). Each swatch is painted in the calm tone avatars are shown in (`calmColor`), so what
 * you pick is what everyone sees; the chosen one gets an ink ring. 36px hit targets.
 */
function AvatarColorPicker({ value, colors, onChange, 'aria-label': ariaLabel }) {
  const swatchesRef = useRef([]);
  const selectedIndex = colors.findIndex((color) => color.toLowerCase() === value?.toLowerCase());
  const focusIndex = Math.max(0, selectedIndex);

  const handleKeyDown = (event, index) => {
    let next;
    if (event.key in ARROW_STEPS) {
      next = (index + ARROW_STEPS[event.key] + colors.length) % colors.length;
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = colors.length - 1;
    else return;
    event.preventDefault();
    onChange(colors[next]);
    swatchesRef.current[next]?.focus();
  };

  return (
    // Phones: rows of five (never a lone swatch on a second row); one row from `sm` up.
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="-ml-1.5 grid grid-cols-[repeat(5,2.25rem)] gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:gap-0.5"
    >
      {colors.map((color, index) => {
        const selected = index === selectedIndex;
        const name = COLOR_NAMES[color.toLowerCase()] ?? color;
        return (
          <button
            key={color}
            ref={(element) => {
              swatchesRef.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(color)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="focus-ring group flex h-9 w-9 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: calmColor(color) }}
              className={cn(
                'h-6 w-6 rounded-full transition-transform duration-150 group-hover:scale-105',
                selected && 'ring-[1.5px] ring-fg ring-offset-[3px] ring-offset-canvas',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
