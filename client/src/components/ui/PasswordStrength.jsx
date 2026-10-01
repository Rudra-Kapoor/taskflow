import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PASSWORD_REQUIREMENTS } from '@/lib/constants';

const LEVELS = [
  { label: 'Too weak', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { label: 'Good', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
];

/** 0-4 score: length, letters + digits, mixed case, symbol or 12+ characters. */
function getPasswordScore(password = '') {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  const meetsPolicy = PASSWORD_REQUIREMENTS.every((rule) => rule.test(password));
  return meetsPolicy ? Math.max(score, 2) : Math.min(score, 1);
}

/** Live strength meter + checklist of the API password rules. */
export function PasswordStrength({ password = '', className }) {
  const score = getPasswordScore(password);
  const level = LEVELS[score];

  return (
    <div className={cn('space-y-2.5', className)} aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'h-1 rounded-full transition-colors duration-300',
                password && score >= step ? level.bar : 'bg-line',
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            'w-16 text-right text-xs font-medium',
            password ? level.text : 'text-fg-subtle',
          )}
        >
          {password ? level.label : 'Strength'}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const met = rule.test(password);
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                met ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors',
                  met ? 'bg-emerald-500 text-white' : 'border border-line-strong',
                )}
              >
                {met && <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />}
              </span>
              <span>{rule.label}</span>
              <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
