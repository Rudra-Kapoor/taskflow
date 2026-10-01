import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { AuthHeading, AuthLayout, AuthSwitch } from '@/components/layout/AuthLayout';
import { Alert, Button, FormField, Input, PasswordInput, PasswordStrength } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { getFirstName } from '@/lib/format';
import { getSafeRedirect } from '@/routes/redirect';

/** Mirrors the API validation rules (name 2-60, valid email, password 8-72 with letter + digit). */
const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(120, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  });

  const password = watch('password');

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const user = await registerAccount(values);
      toast.success(`Welcome to TaskFlow${user?.name ? `, ${getFirstName(user.name)}` : ''}`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'));
      }
    }
  };

  const loginLink = searchParams.get('redirect')
    ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect'))}`
    : '/login';

  return (
    <AuthLayout>
      <AuthHeading
        eyebrow="Get started"
        title="Create your account"
        subtitle="Set up your team’s workspace in under a minute."
      />

      {formError && (
        <Alert variant="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Full name" htmlFor="register-name" error={errors.name?.message} required>
          <Input
            id="register-name"
            autoComplete="name"
            placeholder="Alex Morgan"
            {...register('name')}
          />
        </FormField>

        <FormField
          label="Work email"
          htmlFor="register-email"
          error={errors.email?.message}
          required
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register('email')}
          />
        </FormField>

        <div className="space-y-3">
          <FormField
            label="Password"
            htmlFor="register-password"
            error={errors.password?.message}
            required
          >
            <PasswordInput
              id="register-password"
              icon={null}
              autoComplete="new-password"
              placeholder="Create a strong password"
              {...register('password')}
            />
          </FormField>

          <PasswordStrength password={password} />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            iconRight={isSubmitting ? undefined : ArrowRight}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </div>
      </form>

      <AuthSwitch prompt="Already have an account?" to={loginLink}>
        Sign in
      </AuthSwitch>
    </AuthLayout>
  );
}
