import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { AuthHeading, AuthLayout, AuthSwitch } from '@/components/layout/AuthLayout';
import { Alert, Button, FormField, Input, PasswordInput, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { cn } from '@/lib/cn';
import { DEMO_CREDENTIALS, DEMO_TEAMMATES } from '@/lib/constants';
import { getFirstName } from '@/lib/format';
import { getSafeRedirect } from '@/routes/redirect';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const [formError, setFormError] = useState('');
  const [submitMode, setSubmitMode] = useState(null); // 'form' | 'demo' while signing in
  const [filledFor, setFilledFor] = useState(null);
  const submitRef = useRef(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const signIn = async (credentials, mode) => {
    setFormError('');
    setSubmitMode(mode);
    try {
      const user = await login(credentials);
      toast.success(`Welcome back${user?.name ? `, ${getFirstName(user.name)}` : ''}`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Unable to sign in. Please try again.'));
      }
      setSubmitMode(null);
    }
  };

  const onSubmit = (values) => signIn(values, 'form');

  const fillCredentials = (email) => {
    clearErrors();
    setFormError('');
    setValue('email', email);
    setValue('password', DEMO_CREDENTIALS.password);
  };

  const signInWithDemo = () => {
    fillCredentials(DEMO_CREDENTIALS.email);
    signIn(DEMO_CREDENTIALS, 'demo');
  };

  const fillTeammate = (teammate) => {
    fillCredentials(teammate.email);
    setFilledFor(teammate.email);
    submitRef.current?.focus();
  };

  const busy = submitMode !== null;
  const registerLink = searchParams.get('redirect')
    ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}`
    : '/register';

  return (
    <AuthLayout>
      <AuthHeading
        eyebrow="Sign in"
        title="Welcome back"
        subtitle="Pick up where your team left off."
      />

      <DemoAccountCard onClick={signInWithDemo} loading={submitMode === 'demo'} disabled={busy} />
      <TeammateAccounts onPick={fillTeammate} disabled={busy} filledFor={filledFor} />

      <div
        className="my-6 flex items-center gap-3 [@media(max-height:760px)]:my-5"
        role="presentation"
      >
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          or with email
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>

      {formError && (
        <Alert variant="error" className="mb-4">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register('email', { onChange: () => setFilledFor(null) })}
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
          <PasswordInput
            id="login-password"
            icon={null}
            autoComplete="current-password"
            placeholder="Enter your password"
            {...register('password', { onChange: () => setFilledFor(null) })}
          />
        </FormField>

        <div className="pt-2">
          <Button
            ref={submitRef}
            type="submit"
            size="lg"
            fullWidth
            loading={submitMode === 'form'}
            disabled={busy}
            iconRight={submitMode === 'form' ? undefined : ArrowRight}
          >
            {submitMode === 'form' ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>

      <AuthSwitch prompt="New to TaskFlow?" to={registerLink}>
        Create an account
      </AuthSwitch>
    </AuthLayout>
  );
}

/** One-click sign-in with the seeded demo workspace, credentials shown in mono. */
function DemoAccountCard({ onClick, loading, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring group w-full overflow-hidden rounded-lg border border-line-strong bg-surface text-left',
        'transition-colors duration-150 hover:border-fg/70 disabled:pointer-events-none',
        disabled && !loading && 'opacity-60',
      )}
    >
      <span className="flex items-center gap-3 px-4 py-3.5">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">Use demo workspace</span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            Sample teams, projects and tasks, ready to explore.
          </span>
        </span>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white',
            'transition-transform duration-150 group-hover:translate-x-0.5',
          )}
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          )}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line bg-surface-muted/60 px-4 py-2.5 font-mono text-xs">
        <span>
          <span className="text-fg-subtle">email </span>
          <span className="text-fg">{DEMO_CREDENTIALS.email}</span>
        </span>
        <span>
          <span className="text-fg-subtle">password </span>
          <span className="text-fg">{DEMO_CREDENTIALS.password}</span>
        </span>
      </span>
    </button>
  );
}

/** The other seeded accounts: a click fills the form (e.g. to try live collaboration). */
function TeammateAccounts({ onPick, disabled, filledFor }) {
  const filled = DEMO_TEAMMATES.find((teammate) => teammate.email === filledFor);

  return (
    <div className="mt-5 [@media(max-height:760px)]:mt-4">
      <p id="demo-teammates-label" className="text-xs text-fg-muted">
        Or sign in as a teammate, same password:
      </p>
      <ul aria-labelledby="demo-teammates-label" className="mt-2.5 flex flex-wrap gap-1.5">
        {DEMO_TEAMMATES.map((teammate) => {
          const pressed = teammate.email === filledFor;
          return (
            <li key={teammate.email}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(teammate)}
                aria-pressed={pressed}
                aria-label={`Fill in ${teammate.name}’s account (${teammate.hint})`}
                title={`${teammate.name} · ${teammate.hint}`}
                className={cn(
                  'focus-ring inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium touch:h-9',
                  'transition-colors duration-150 disabled:opacity-60',
                  pressed
                    ? 'border-fg bg-fg text-canvas'
                    : 'border-line-strong bg-transparent text-fg-muted hover:border-fg/60 hover:text-fg',
                )}
              >
                {getFirstName(teammate.name)}
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {filled ? `${filled.name}’s account is filled in. Press Sign in to continue.` : ''}
      </p>
    </div>
  );
}
