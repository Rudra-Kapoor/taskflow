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
          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover"
        >
          <Avatar user={user} size="sm" decorative />
        </button>
      }
    >
      {/* Not a menu item: plain context for the entries below. */}
      <div role="presentation" className="px-2.5 pb-2.5 pt-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          Signed in as
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <Avatar user={user} size="md" decorative />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-fg">{user.name}</div>
            <div className="mt-0.5 truncate text-xs text-fg-muted">{user.email}</div>
          </div>
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
