import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FolderPlus,
  ListTodo,
  Plus,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { AddMemberModal } from '@/components/teams/AddMemberModal';
import { TeamFormModal } from '@/components/teams/TeamFormModal';
import { Badge, Button, ProgressBar, Tooltip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useManagedTeams } from '@/hooks/pages/useManagedTeams';
import { cn } from '@/lib/cn';
import { getFirstName } from '@/lib/format';

/**
 * First-run guide shown instead of empty stats until the user has a team and a project:
 * create a team -> invite teammates -> create a project (opens its board) -> add tasks there.
 * Inviting is optional: the project step is available as soon as there is a team.
 */
export function OnboardingCard({ stats }) {
  const { user } = useAuth();
  const { teams, managedTeams, canManageAny } = useManagedTeams();
  const [dialog, setDialog] = useState(null); // 'team' | 'invite' | 'project'

  const hasTeam = (stats?.teams ?? 0) > 0 || teams.length > 0;
  const teamWithPeople = teams.find((team) => (team.members?.length ?? 0) > 1);
  const hasProject = (stats?.projects ?? 0) > 0;
  const completed = Number(hasTeam) + Number(Boolean(teamWithPeople)) + Number(hasProject);
  const firstTeam = managedTeams[0] ?? teams[0];
  const inviteCurrent = hasTeam && !teamWithPeople && canManageAny;

  const steps = [
    {
      icon: Users,
      title: 'Create a team',
      description: 'Teams group the people you work with. You’ll be the owner of yours.',
      state: hasTeam ? 'done' : 'current',
      action: hasTeam ? (
        <Button
          as={Link}
          to={firstTeam ? `/teams/${firstTeam._id}` : '/teams'}
          variant="ghost"
          size="sm"
          iconRight={ArrowRight}
          className="-ml-2"
        >
          View team
        </Button>
      ) : (
        <Button size="sm" icon={Plus} onClick={() => setDialog('team')}>
          Create a team
        </Button>
      ),
    },
    {
      icon: UserPlus,
      title: 'Invite teammates',
      description: 'Add the people you work with, so you can share boards and assign them tasks.',
      state: teamWithPeople ? 'done' : inviteCurrent ? 'current' : 'upcoming',
      action: teamWithPeople ? (
        <Button
          as={Link}
          to={`/teams/${teamWithPeople._id}`}
          variant="ghost"
          size="sm"
          iconRight={ArrowRight}
          className="-ml-2"
        >
          View members
        </Button>
      ) : (
        <Button
          size="sm"
          icon={UserPlus}
          variant={inviteCurrent ? 'primary' : 'secondary'}
          disabled={!inviteCurrent}
          onClick={() => setDialog('invite')}
        >
          Add teammates
        </Button>
      ),
    },
    {
      icon: FolderPlus,
      title: 'Create a project',
      description: 'Give the work a home: a board with To Do, In Progress and Completed.',
      state: hasProject ? 'done' : hasTeam && !inviteCurrent ? 'current' : 'upcoming',
      action: (
        <Tooltip
          content={
            hasTeam && !canManageAny ? 'Only team owners and admins can create projects' : null
          }
        >
          <Button
            size="sm"
            icon={Plus}
            variant={hasTeam && !inviteCurrent ? 'primary' : 'secondary'}
            disabled={!hasTeam || !canManageAny}
            onClick={() => setDialog('project')}
          >
            Create a project
          </Button>
        </Tooltip>
      ),
    },
    {
      icon: ListTodo,
      title: 'Add tasks',
      description: 'Break the work down, assign teammates and watch the board update live.',
      state: 'upcoming',
      action: (
        <p className="text-xs text-fg-muted">Your new board opens right after step 3.</p>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="onboarding-title"
      className="card relative isolate overflow-hidden p-5 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-surface to-violet-50 dark:from-brand-500/[0.08] dark:via-surface dark:to-violet-500/[0.08]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-500/15"
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-md shadow-brand-600/30">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2
            id="onboarding-title"
            className="mt-5 text-xl font-semibold tracking-tight text-fg sm:text-2xl"
          >
            Welcome to TaskFlow, {getFirstName(user?.name) || 'there'}!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Let’s set up your workspace. A few quick steps and your team can plan, track and
            ship together in real time.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <ProgressBar
              value={(completed / steps.length) * 100}
              size="md"
              className="max-w-[12rem]"
              label="Setup progress"
            />
            <span className="text-xs font-medium text-fg-muted">
              {completed} of {steps.length} done
            </span>
          </div>
        </div>
        <BoardIllustration className="hidden lg:block" />
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <OnboardingStep key={step.title} step={step} number={index + 1} />
        ))}
      </ol>

      <p className="mt-6 text-xs text-fg-muted">
        Joining an existing team instead? Ask one of its owners or admins to add you with{' '}
        <span className="font-medium text-fg">{user?.email}</span>.
      </p>

      <TeamFormModal open={dialog === 'team'} onClose={() => setDialog(null)} />
      {managedTeams[0] && (
        <AddMemberModal
          open={dialog === 'invite'}
          onClose={() => setDialog(null)}
          team={managedTeams[0]}
        />
      )}
      <ProjectFormModal
        open={dialog === 'project'}
        onClose={() => setDialog(null)}
        defaultTeamId={managedTeams[0]?._id}
      />
    </section>
  );
}

function OnboardingStep({ step, number }) {
  const Icon = step.icon;
  const isDone = step.state === 'done';
  const isCurrent = step.state === 'current';

  return (
    <li
      className={cn(
        'flex flex-col rounded-xl border bg-surface/90 p-5 backdrop-blur-sm transition-shadow',
        isCurrent
          ? 'border-brand-300 shadow-lg shadow-brand-600/10 ring-1 ring-brand-500/20 dark:border-brand-400/40'
          : 'border-line',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            isDone && 'bg-emerald-500 text-white',
            isCurrent && 'bg-brand-600 text-white dark:bg-brand-500',
            !isDone && !isCurrent && 'bg-surface-muted text-fg-subtle ring-1 ring-inset ring-line',
          )}
        >
          {isDone ? (
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
          Step {number}
        </span>
        {isDone && (
          <Badge color="green" size="sm" className="ml-auto">
            Done
          </Badge>
        )}
        {isCurrent && (
          <Badge color="brand" size="sm" className="ml-auto">
            Up next
          </Badge>
        )}
      </div>
      <h3 className={cn('mt-4 text-sm font-semibold', isDone ? 'text-fg-muted' : 'text-fg')}>
        {step.title}
      </h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-fg-muted">{step.description}</p>
      <div className="mt-5">{step.action}</div>
    </li>
  );
}

const PREVIEW_COLUMNS = [
  { dot: 'bg-slate-400', cards: [['w-4/5', 'bg-sky-400'], ['w-3/5', 'bg-amber-400']] },
  { dot: 'bg-blue-500', cards: [['w-2/3', 'bg-rose-400']] },
  { dot: 'bg-emerald-500', cards: [['w-3/4', 'bg-violet-400'], ['w-1/2', 'bg-emerald-400']] },
];

/** Decorative mini board (pure markup) hinting at what the user is about to build. */
function BoardIllustration({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'w-80 shrink-0 rotate-[-2deg] rounded-2xl border border-line bg-surface/80 p-3 shadow-xl shadow-brand-900/10 backdrop-blur',
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-3 w-3 rounded bg-brand-500" />
        <span className="h-2 w-24 rounded-full bg-line-strong" />
        <span className="ml-auto flex -space-x-1.5">
          {['#f97316', '#22c55e', '#ec4899'].map((color) => (
            <span
              key={color}
              className="h-4 w-4 rounded-full ring-2 ring-surface"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PREVIEW_COLUMNS.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2 rounded-xl bg-surface-muted p-2">
            <span className={cn('block h-1.5 w-1.5 rounded-full', column.dot)} />
            {column.cards.map(([width, tag], cardIndex) => (
              <div
                key={cardIndex}
                className="space-y-1.5 rounded-lg border border-line bg-surface p-2 shadow-xs"
              >
                <span className={cn('block h-1 w-5 rounded-full', tag)} />
                <span className={cn('block h-1.5 rounded-full bg-line-strong', width)} />
                <span className="block h-1.5 w-2/5 rounded-full bg-line" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
