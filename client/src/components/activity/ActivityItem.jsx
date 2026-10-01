import { Link, useLocation } from 'react-router-dom';
import { Avatar, TimeAgo } from '@/components/ui';
import { describeActivity } from '@/lib/activity';
import { cn } from '@/lib/cn';
import { getId } from '@/lib/ids';
import { TASK_LINK_STATE, withTaskParam } from '@/lib/taskLinks';

/** "WEB-12 Fix login" -> ["WEB-12", "Fix login"], so task keys can be set in mono. */
const TASK_KEY_PATTERN = /^([A-Z][A-Z0-9]{0,9}-\d+)\s+(.+)$/;

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

/** The sentence's object; a leading task key ("WEB-12") is set in mono. */
function TargetText({ target, targetType }) {
  const match = targetType === 'task' ? TASK_KEY_PATTERN.exec(target) : null;
  if (!match) return target;
  return (
    <>
      <span className="font-mono text-[0.92em] font-normal tracking-[0.01em] text-fg-muted">
        {match[1]}
      </span>{' '}
      {match[2]}
    </>
  );
}

/**
 * One activity log entry: "<Avatar> **Priya** moved WEB-12 **Fix login** from To Do to In Progress"
 * with a mono meta line (action glyph + relative time) and, for comments, the excerpt set as a
 * quote. `compact` (side panels, dashboard) uses a smaller avatar and type.
 */
export function ActivityItem({ activity, showProject = false, compact = false, className }) {
  const { verb, target, detail, quote, icon: Icon, targetType } = describeActivity(activity);
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
    <div className={cn('relative flex', compact ? 'gap-3' : 'gap-3.5', className)}>
      <div className="relative flex shrink-0 self-start">
        <Avatar user={activity.actor ?? null} size={compact ? 'sm' : 'md'} decorative />
      </div>

      <div className={cn('min-w-0 flex-1', compact ? 'pt-[3px]' : 'pt-1.5')}>
        <p className={cn('text-fg-muted', compact ? 'text-[13px] leading-[1.5]' : 'text-sm leading-[1.5]')}>
          <span className="font-medium text-fg">{actorName}</span> {verb}
          {target && (
            <>
              {' '}
              {link ? (
                <Link
                  to={link.to}
                  state={link.state}
                  className="rounded-sm font-medium text-fg underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <TargetText target={target} targetType={targetType} />
                </Link>
              ) : (
                <span className="font-medium text-fg">
                  <TargetText target={target} targetType={targetType} />
                </span>
              )}
            </>
          )}
          {detail && <> {detail}</>}
          {showProjectName && (
            <>
              {' '}
              in <span className="text-fg">{projectName}</span>
            </>
          )}
        </p>

        {quote && (
          <p
            className={cn(
              'mt-1.5 line-clamp-3 border-l-2 border-line-strong pl-3 text-fg-muted',
              compact ? 'text-[13px] leading-[1.5]' : 'text-sm leading-[1.5]',
            )}
          >
            {quote}
          </p>
        )}

        <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] leading-4 tabular-nums text-fg-subtle">
          {Icon && <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />}
          <TimeAgo date={activity.createdAt} />
        </div>
      </div>
    </div>
  );
}
