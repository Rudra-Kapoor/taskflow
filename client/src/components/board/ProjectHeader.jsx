import { Fragment, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Users } from 'lucide-react';
import { ProjectTile } from '@/components/projects/ProjectTile';
import { Badge, ProgressBar } from '@/components/ui';
import { useIsTruncated } from '@/hooks/board/useIsTruncated';
import { cn } from '@/lib/cn';
import { PROJECT_COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { getId } from '@/lib/ids';

/** Short inline items separated by middle dots (only between items that are present). */
function DotSeparated({ items }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {items.filter(Boolean).map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 && (
            <span aria-hidden="true" className="text-fg-subtle">
              ·
            </span>
          )}
          {item}
        </Fragment>
      ))}
    </span>
  );
}

function Progress({ completed, total, color }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <ProgressBar
        value={percent}
        color={color}
        label={`${percent}% of tasks completed`}
        className="w-16 sm:w-24"
      />
      <span>
        <span className="font-semibold text-fg">{formatNumber(completed)}</span>/
        {formatNumber(total)} done
        <span className="ml-1.5 font-semibold tabular-nums text-fg">{percent}%</span>
      </span>
    </span>
  );
}

/** One line of description with a "more" toggle when it doesn't fit. */
function Description({ text }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef(null);
  const truncated = useIsTruncated(textRef, text);

  return (
    <div className="mt-1.5 flex max-w-3xl items-baseline gap-1.5">
      <p
        ref={textRef}
        className={cn(
          'min-w-0 whitespace-pre-line break-words text-sm leading-relaxed text-fg-muted',
          !expanded && 'line-clamp-1',
        )}
      >
        {text}
      </p>
      {(truncated || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="focus-ring shrink-0 rounded text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
    </div>
  );
}

/**
 * Compact board page header: project tile, name, a meta line (team · key · progress) and the
 * description on one line, with slots for live presence and the project actions menu.
 */
export function ProjectHeader({ project, completed, total, presence, actions }) {
  const teamId = getId(project.team);
  const archived = project.status === 'archived';
  const color = project.color || PROJECT_COLORS[0];

  return (
    <header className="flex items-start gap-3 sm:gap-4">
      <ProjectTile
        projectKey={project.key}
        color={color}
        className={cn('mt-0.5', archived && 'grayscale')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="min-w-0 break-words text-xl font-semibold leading-tight tracking-tight text-fg sm:text-2xl">
                {project.name}
              </h1>
              {archived && (
                <Badge color="yellow" size="sm">
                  <Archive className="h-3 w-3" aria-hidden="true" />
                  Archived
                </Badge>
              )}
            </div>
            {/* The progress wraps below team · key on narrow screens (no dangling separator). */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-fg-muted">
              <DotSeparated
                items={[
                  teamId && (
                    <Link
                      key="team"
                      to={`/teams/${teamId}`}
                      className="focus-ring inline-flex min-w-0 items-center gap-1.5 rounded font-medium transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{project.team?.name ?? 'Team'}</span>
                    </Link>
                  ),
                  <span key="key" className="font-mono text-xs">
                    {project.key}
                  </span>,
                ]}
              />
              <Progress completed={completed} total={total} color={color} />
            </div>
          </div>
          {(presence || actions) && (
            <div className="flex shrink-0 items-center gap-2">
              {presence}
              {actions}
            </div>
          )}
        </div>
        {project.description && (
          <Description key={project.description} text={project.description} />
        )}
      </div>
    </header>
  );
}
