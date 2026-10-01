import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { Avatar, DropdownItem, DropdownMenu, DropdownSeparator } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLogout } from '@/hooks/useLogout';

/** The account menu (avatar in the top bar): profile & settings, theme switch and sign out. */
export function UserMenu() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const logout = useLogout();

  if (!user) return null;

  return (
    <DropdownMenu
      align="end"
      width="w-64"
      trigger={
        <button
          type="button"
          aria-label={`Account menu for ${user.name}`}
          className="focus-ring rounded-full transition-shadow hover:ring-4 hover:ring-surface-hover aria-expanded:ring-4 aria-expanded:ring-brand-500/20"
        >
          <Avatar user={user} size="md" decorative />
        </button>
      }
    >
      {/* Not a menu item: plain context for the entries below. */}
      <div role="presentation" className="flex items-center gap-3 px-2.5 pb-2.5 pt-2">
        <Avatar user={user} size="lg" decorative />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fg">{user.name}</div>
          <div className="truncate text-xs text-fg-muted">{user.email}</div>
        </div>
      </div>
      <DropdownSeparator />
      <DropdownItem icon={Settings} to="/profile">
        Profile &amp; settings
      </DropdownItem>
      <DropdownItem icon={isDark ? Sun : Moon} onClick={toggleTheme}>
        {isDark ? 'Light mode' : 'Dark mode'}
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem icon={LogOut} danger onClick={logout}>
        Log out
      </DropdownItem>
    </DropdownMenu>
  );
}
