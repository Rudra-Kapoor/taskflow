import { useTheme } from '@/context/ThemeContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';

/** Literal colours: each preview shows its theme regardless of the one currently active. */
const PALETTES = {
  light: { canvas: '#f5f3ee', surface: '#ffffff', line: '#e2ded4', text: '#cfcabe', ink: '#191814' },
  dark: { canvas: '#0f0f0e', surface: '#171715', line: '#2b2a26', text: '#3a3833', ink: '#eeece6' },
};

const THEMES = [
  { value: 'light', label: 'Light', description: 'Warm paper and ink, for daytime.' },
  { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light.' },
  // Completed with the device's current theme, see `describe`.
  { value: 'system', label: 'System', description: 'Matches your device' },
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
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('grid gap-3', options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
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
  );
}

/**
 * Miniature app window in the given palette: a paper sidebar with one vermilion nav marker, a
 * title line and three hairline cards.
 */
function PreviewArt({ palette, className, style }) {
  const { canvas, surface, line, text, ink } = palette;

  return (
    <div
      className={cn('flex h-24 overflow-hidden rounded-md border', className)}
      style={{ backgroundColor: canvas, borderColor: line, ...style }}
    >
      <div className="w-[28%] space-y-1.5 border-r p-2" style={{ borderColor: line }}>
        <span className="block h-1 w-2/5 rounded-[1px]" style={{ backgroundColor: ink }} />
        <span className="flex items-center gap-1 pt-1">
          <span className="h-1.5 w-0.5 bg-brand-500" />
          <span className="block h-1 flex-1 rounded-[1px]" style={{ backgroundColor: text }} />
        </span>
        <span className="ml-1.5 block h-1 w-3/4 rounded-[1px]" style={{ backgroundColor: text }} />
        <span className="ml-1.5 block h-1 w-1/2 rounded-[1px]" style={{ backgroundColor: text }} />
      </div>
      <div className="flex-1 space-y-2 p-2">
        <span className="block h-1.5 w-1/3 rounded-[1px]" style={{ backgroundColor: ink }} />
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="flex h-11 flex-col gap-1 rounded-[3px] border p-1.5"
              style={{ backgroundColor: surface, borderColor: line }}
            >
              <span className="block h-1 w-3/4 rounded-[1px]" style={{ backgroundColor: text }} />
              <span className="block h-1 w-1/2 rounded-[1px]" style={{ backgroundColor: text }} />
            </span>
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

/** Radio card: hairline when idle, ink outline and a small radio dot when chosen. */
function ThemeOption({ option, description, checked, onSelect }) {
  return (
    <label
      className={cn(
        'relative block cursor-pointer rounded-lg border bg-surface p-2 transition-[border-color,box-shadow] duration-150',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas',
        checked
          ? 'border-fg shadow-[inset_0_0_0_1px_rgb(var(--color-fg))]'
          : 'border-line hover:border-line-strong',
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
      <div className="mt-2.5 flex items-start gap-2.5 px-1 pb-1">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            checked ? 'border-fg' : 'border-line-strong',
          )}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-brand-500" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">{option.label}</span>
          <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{description}</span>
        </span>
      </div>
    </label>
  );
}
