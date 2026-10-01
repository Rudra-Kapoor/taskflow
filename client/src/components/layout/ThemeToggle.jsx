import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';

/** Sun / moon button that flips between light and dark mode. */
export function ThemeToggle({ size = 'md', variant = 'ghost', className }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <IconButton
      icon={isDark ? Sun : Moon}
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      size={size}
      variant={variant}
      className={className}
    />
  );
}
