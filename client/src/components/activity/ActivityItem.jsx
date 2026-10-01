import { Link, useLocation } from 'react-router-dom';
import { Avatar, TimeAgo } from '@/components/ui';
import { describeActivity } from '@/lib/activity';
import { cn } from '@/lib/cn';
import { getId } from '@/lib/ids';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';

/** Where the bold target of a sentence links to (`null` = plain text). */
function useTargetLink(activity, targetType) {
  const location = useLocation();
  const taskId = getId(activity.task);
  const projectId = getId(activity.project);
  const teamId = getId(activity.team);

  // Tasks open in the global task modal over the current page (keeping its filters).
  if (targetType === 'task' && taskId) {
    return { to: withTaskParam(taskId, location), state: TASK_LINK_STATE };
  }
  if (targetType === 'project' && projectId) return { to: `/projects/${projectId}` };
  if (targetType === 'team' && teamId) return { to: `/teams/${teamId}` };
  return null;
}

/** Small tinted circle with the action icon (status change, comment, assignment, …). */
function ActionIcon({ icon: Icon, tone, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex items-center justify-center rounded-full', tone, className)}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.75} />
    </span>
  );
}

/**
 * One activity log entry: "<Avatar> **Priya** moved **WEB-12 Fix login** from To Do to In Progress"
 * with an action icon, relative time and (for comments) the excerpt.
 * `compact` (side panels) uses a smaller avatar and shows the action icon next to the time.
 */
export function ActivityItem({ activity, showProject = false, compact = false, className }) {
  const { verb, target, detail, quote, icon, tone, targetType } = describeActivity(activity);
  const link = useTargetLink(activity, targetType);
  const actorName = activity.actor?.name ?? 'Someone';
  const projectName = activity.meta?.projectName;
  const showProjectName =
    showProject &&
    projectName &&
    projectName !== target &&
    targetType !== 'project' &&
    !activity.action?.startsWith('project.');

  return (
    <div className={cn('relative flex', compact ? 'gap-2.5' : 'gap-3', className)}>
      <div className="relative flex shrink-0 self-start">
        <Avatar user={activity.actor ?? null} size={compact ? 'sm' : 'md'} decorative />
        {!compact && (
          <ActionIcon
            icon={icon}
            tone={tone}
            className="absolute -bottom-1 -right-1.5 h-4 w-4 ring-2 ring-surface"
          />
        )}
      </div>

      <div className={cn('min-w-0 flex-1', compact ? 'pt-px' : 'pt-0.5')}>
        <p
          className={cn('text-fg-muted', compact ? 'text-[13px]' : 'text-sm', 'leading-relaxed')}
        >
          <span className="font-semibold text-fg">{actorName}</span> {verb}
          {target && (
            <>
              {' '}
              {link ? (
                <Link
                  to={link.to}
                  state={link.state}
                  className="rounded-sm font-semibold text-fg underline-offset-2 transition-colors hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-brand-300"
                >
                  {target}
                </Link>
              ) : (
                <span className="font-semibold text-fg">{target}</span>
              )}
            </>
          )}
          {detail && <> {detail}</>}
          {showProjectName && (
            <>
              {' '}
              in <span className="font-medium text-fg">{projectName}</span>
            </>
          )}
        </p>

        {quote && (
          <p
            className={cn(
              'mt-1.5 line-clamp-3 rounded-lg border border-line bg-surface-muted/60 px-3 py-2 text-fg-muted',
              compact ? 'text-xs' : 'text-[13px]',
            )}
          >
            {quote}
          </p>
        )}

        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          {compact && <ActionIcon icon={icon} tone={tone} className="h-4 w-4" />}
          <TimeAgo date={activity.createdAt} />
        </div>
      </div>
    </div>
  );
}
