import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { ArrowRight, KeyRound, Mail, Sparkles } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Alert, Avatar, Button, FormField, Input, PasswordInput, Spinner } from '@/components/ui';
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
      toast.success(`Welcome back${user?.name ? `, ${getFirstName(user.name)}` : ''}!`);
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
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Welcome back</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Sign in to pick up where your team left off.</p>
      </div>

      <DemoAccountCard onClick={signInWithDemo} loading={submitMode === 'demo'} disabled={busy} />
      <TeammateAccounts onPick={fillTeammate} disabled={busy} filledFor={filledFor} />

      <div className="my-6 flex items-center gap-3 text-xs text-fg-muted">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        or sign in with email
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
            icon={Mail}
            autoComplete="email"
            placeholder="you@company.com"
            {...register('email', { onChange: () => setFilledFor(null) })}
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
          <PasswordInput
            id="login-password"
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

      <p className="mt-6 text-center text-sm text-fg-muted">
        New to TaskFlow?{' '}
        <Link
          to={registerLink}
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

/** Highlighted one-click sign-in with the seeded demo workspace. */
function DemoAccountCard({ onClick, loading, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring group relative w-full overflow-hidden rounded-xl border border-brand-200 p-4 text-left',
        'bg-gradient-to-br from-brand-50 via-surface to-violet-50 shadow-xs transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md hover:shadow-brand-600/10',
        'disabled:pointer-events-none disabled:opacity-70',
        'dark:border-brand-500/30 dark:from-brand-500/10 dark:via-surface dark:to-violet-500/10',
        'dark:hover:border-brand-400/50',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-sm shadow-brand-600/30">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">Explore with the demo account</span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            Sample teams, projects and tasks, ready to go.
          </span>
        </span>
        {loading ? (
          <Spinner size="sm" className="text-brand-600 dark:text-brand-400" />
        ) : (
          <ArrowRight
            className="h-4 w-4 shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-400"
            aria-hidden="true"
          />
        )}
      </div>
      <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-brand-200/70 pt-3 text-xs text-fg-muted dark:border-brand-500/20">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          <span className="font-medium text-fg">{DEMO_CREDENTIALS.email}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
          <span className="font-medium text-fg">{DEMO_CREDENTIALS.password}</span>
        </span>
      </span>
    </button>
  );
}

/** The other seeded accounts: a click fills the form (e.g. to try live collaboration). */
function TeammateAccounts({ onPick, disabled, filledFor }) {
  const filled = DEMO_TEAMMATES.find((teammate) => teammate.email === filledFor);

  return (
    <div className="mt-4">
      <p id="demo-teammates-label" className="text-xs text-fg-muted">
        Or sign in as a teammate (same password):
      </p>
      <ul aria-labelledby="demo-teammates-label" className="mt-2 grid grid-cols-5 gap-1.5">
        {DEMO_TEAMMATES.map((teammate) => (
          <li key={teammate.email}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(teammate)}
              aria-pressed={teammate.email === filledFor}
              aria-label={`Fill in ${teammate.name}’s account (${teammate.hint})`}
              title={`${teammate.name} · ${teammate.hint}`}
              className={cn(
                'focus-ring flex w-full flex-col items-center gap-1 rounded-lg border px-1 py-2',
                'text-xs font-medium transition-colors disabled:opacity-60',
                teammate.email === filledFor
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/40 dark:bg-brand-500/10 dark:text-brand-200'
                  : 'border-transparent text-fg-muted hover:bg-surface-hover hover:text-fg',
              )}
            >
              <Avatar user={teammate} size="md" decorative />
              {getFirstName(teammate.name)}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {filled ? `${filled.name}’s account is filled in. Press Sign in to continue.` : ''}
      </p>
    </div>
  );
}
