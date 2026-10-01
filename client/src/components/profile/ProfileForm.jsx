import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Briefcase, Mail, UserRound } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { Button, ColorPicker, FormField, Input } from '@/components/ui';
import { useUpdateProfile } from '@/hooks/queries/auth';
import { AVATAR_COLORS } from '@/lib/constants';
import { SettingsCard } from './SettingsSection';

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
    <SettingsCard
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
          <Input icon={UserRound} autoComplete="name" maxLength={60} {...register('name')} />
        </FormField>
        <FormField label="Job title" error={errors.title?.message} hint="Optional">
          <Input
            icon={Briefcase}
            placeholder="e.g. Product Designer"
            autoComplete="organization-title"
            maxLength={80}
            {...register('title')}
          />
        </FormField>
      </div>

      <FormField label="Email" hint="Your sign-in email can’t be changed.">
        <Input icon={Mail} value={user?.email ?? ''} readOnly disabled />
      </FormField>

      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-fg">Avatar colour</p>
        <ColorPicker
          value={avatarColor}
          colors={colors}
          aria-label="Avatar colour"
          onChange={(value) => setValue('avatarColor', value, { shouldDirty: true })}
        />
      </div>
    </SettingsCard>
  );
}
