import { Crown, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ROLE_META } from '@/lib/constants';

const ROLE_ICONS = { owner: Crown, admin: ShieldCheck, member: UserRound };

/** Team role pill (Owner / Admin / Member) with its icon. */
export function RoleBadge({ role, size = 'sm', className }) {
  const meta = ROLE_META[role];
  if (!meta) return null;
  const Icon = ROLE_ICONS[role];

  return (
    <Badge color={meta.badge} size={size} className={className}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
