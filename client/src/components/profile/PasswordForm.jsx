import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { Button, FormField, PasswordInput, PasswordStrength } from '@/components/ui';
import { useChangePassword } from '@/hooks/queries/auth';
import { SettingsPanel } from './SettingsSection';

/** Mirrors the API policy: 8-72 characters with a letter and a number, different from the old. */
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .superRefine(({ currentPassword, newPassword, confirmPassword }, context) => {
    if (newPassword && newPassword === currentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newPassword'],
        message: 'Choose a password different from your current one',
      });
    }
    if (confirmPassword && confirmPassword !== newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords don’t match',
      });
    }
  });

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Slightly taller fields, so their show / hide toggle can be a 36px touch target. */
const FIELD_SIZE = { className: 'h-10 pr-12', wrapperClassName: '[&_button]:h-9 [&_button]:w-9' };

/** Change password: current password check (server side), strength meter, confirmation. */
export function PasswordForm() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  });

  const newPassword = watch('newPassword');

  const onSubmit = async ({ currentPassword, newPassword: password }) => {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword: password });
      reset(EMPTY);
      toast.success('Password updated');
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        toast.error(getErrorMessage(error, 'Could not update your password.'));
      }
    }
  };

  return (
    <SettingsPanel
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      footer={
        <Button type="submit" icon={KeyRound} loading={isSubmitting} disabled={!isDirty}>
          Update password
        </Button>
      }
    >
      <FormField label="Current password" error={errors.currentPassword?.message} required>
        <PasswordInput
          autoComplete="current-password"
          placeholder="Your current password"
          {...FIELD_SIZE}
          {...register('currentPassword')}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="New password" error={errors.newPassword?.message} required>
          <PasswordInput
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...FIELD_SIZE}
            {...register('newPassword')}
          />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message} required>
          <PasswordInput
            autoComplete="new-password"
            placeholder="Repeat the new password"
            {...FIELD_SIZE}
            {...register('confirmPassword')}
          />
        </FormField>
      </div>

      <PasswordStrength password={newPassword} />
    </SettingsPanel>
  );
}
