import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

/** Literal colours: each preview shows its theme regardless of the one currently active. */
const PALETTES = {
  light: { canvas: '#f6f7fb', surface: '#ffffff', line: '#e3e6ef', text: '#cfd4e1' },
  dark: { canvas: '#0b0e16', surface: '#121725', line: '#242c3f', text: '#323b52' },
};

const THEMES = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright and crisp, great for daytime.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    // Completed with the device's current theme, see `describe`.
    description: 'Matches your device',
    icon: Monitor,
  },
];

/**
 * Light / dark / system theme picker with miniature previews (saved per device). `preference`
 * is what the user picked ("system" follows the OS); without it only light and dark exist.
 */
export function AppearanceSettings() {
  const { theme, preference, setTheme } = useTheme();
  const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)');
  const options =
    preference === undefined ? THEMES.filter((option) => option.value !== 'system') : THEMES;
  const selected = preference ?? theme;
  const describe = (option) =>
    option.value === 'system'
      ? `${option.description} (currently ${systemIsDark ? 'dark' : 'light'}).`
      : option.description;

  return (
    <Card>
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn('grid gap-4', options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
      >
        {options.map((option) => (
          <ThemeOption
            key={option.value}
            option={option}
            description={describe(option)}
            checked={selected === option.value}
            onSelect={() => setTheme(option.value)}
          />
        ))}
      </div>
    </Card>
  );
}

/** Miniature app window (sidebar + three cards) in the given palette. */
function PreviewArt({ palette, className, style }) {
  const { canvas, surface, line, text } = palette;

  return (
    <div
      className={cn('flex h-24 gap-2 overflow-hidden rounded-lg border p-2', className)}
      style={{ backgroundColor: canvas, borderColor: line, ...style }}
    >
      <div className="w-1/4 space-y-1.5 rounded-md p-1.5" style={{ backgroundColor: surface }}>
        <span className="block h-1.5 w-3/4 rounded-full bg-brand-500" />
        <span className="block h-1.5 rounded-full" style={{ backgroundColor: text }} />
        <span className="block h-1.5 w-4/5 rounded-full" style={{ backgroundColor: text }} />
      </div>
      <div className="flex-1 space-y-2 rounded-md p-2" style={{ backgroundColor: surface }}>
        <span className="block h-2 w-1/2 rounded-full" style={{ backgroundColor: text }} />
        <div className="grid grid-cols-3 gap-1.5">
          {['#6366f1', '#f97316', '#10b981'].map((color) => (
            <span
              key={color}
              className="h-8 rounded border"
              style={{ borderColor: line, borderTopColor: color, borderTopWidth: 3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The system option shows both themes, split diagonally. */
function ThemePreview({ value }) {
  if (value !== 'system') return <PreviewArt palette={PALETTES[value]} />;

  return (
    <div className="relative">
      <PreviewArt palette={PALETTES.light} />
      <PreviewArt
        palette={PALETTES.dark}
        className="absolute inset-0"
        style={{ clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 42% 100%)' }}
      />
    </div>
  );
}

function ThemeOption({ option, description, checked, onSelect }) {
  const Icon = option.icon;

  return (
    <label
      className={cn(
        'group relative block cursor-pointer rounded-xl border p-3 transition-colors duration-150',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/60',
        checked
          ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400/70 dark:bg-brand-500/10'
          : 'border-line hover:border-line-strong hover:bg-surface-hover',
      )}
    >
      <input
        type="radio"
        name="theme"
        value={option.value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <div aria-hidden="true">
        <ThemePreview value={option.value} />
      </div>
      <div className="mt-3 flex items-start gap-2.5 px-1">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">{option.label}</span>
          <span className="block text-xs text-fg-muted">{description}</span>
        </span>
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            checked
              ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
              : 'border-line-strong',
          )}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
        </span>
      </div>
    </label>
  );
}
