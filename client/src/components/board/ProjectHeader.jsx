import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsTruncated } from '@/hooks/board/useIsTruncated';
import { cn } from '@/lib/cn';
import { PROJECT_COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { getId } from '@/lib/ids';

/** Thin inline progress: a hairline track with a vermilion fill and "7/12" in mono. */
function Progress({ completed, total, archived }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="mt-4 flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% of tasks completed`}
        className="h-[3px] w-32 overflow-hidden rounded-full bg-line sm:w-44"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            archived ? 'bg-fg-subtle' : 'bg-brand-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="font-mono text-xs tabular-nums text-fg-muted">
        <span className="text-fg">{formatNumber(completed)}</span>/{formatNumber(total)}
        <span className="ml-1.5 font-sans">done</span>
        <span aria-hidden="true" className="mx-1.5 text-fg-subtle">
          ·
        </span>
        {percent}%
      </p>
    </div>
  );
}

/** One line of description with a "more" toggle when it doesn't fit. */
function Description({ text }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef(null);
  const truncated = useIsTruncated(textRef, text);

  return (
    <div className="mt-2 flex max-w-3xl items-baseline gap-1.5">
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
 * Board page header: mono eyebrow (team · key), the project name set in the display serif, one
 * line of description and the inline progress, with slots on the right for live presence and the
 * project actions menu.
 */
export function ProjectHeader({ project, completed, total, presence, actions }) {
  const teamId = getId(project.team);
  const archived = project.status === 'archived';
  const color = project.color || PROJECT_COLORS[0];

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-fg-muted">
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 shrink-0 rounded-[2px]', archived && 'grayscale')}
            style={{ backgroundColor: color }}
          />
          {teamId && (
            <>
              <Link
                to={`/teams/${teamId}`}
                className="focus-ring min-w-0 truncate rounded-sm transition-colors hover:text-fg"
              >
                {project.team?.name ?? 'Team'}
              </Link>
              <span aria-hidden="true" className="text-fg-subtle">
                ·
              </span>
            </>
          )}
          <span>{project.key}</span>
          {archived && (
            <span className="ml-1 inline-flex h-5 items-center rounded border border-line-strong px-1.5 text-fg-muted">
              Archived
            </span>
          )}
        </p>
        <h1 className="mt-2.5 min-w-0 break-words font-display text-[34px] leading-[1.05] tracking-[-0.01em] text-fg sm:text-[40px]">
          {project.name}
        </h1>
        {project.description && (
          <Description key={project.description} text={project.description} />
        )}
        <Progress completed={completed} total={total} archived={archived} />
      </div>
      {(presence || actions) && (
        <div className="flex shrink-0 items-center gap-3 sm:pt-0.5">
          {presence}
          {actions}
        </div>
      )}
    </header>
  );
}
