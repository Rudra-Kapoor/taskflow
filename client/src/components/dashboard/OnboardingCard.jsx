import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Plus, UserPlus } from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { AddMemberModal } from '@/components/teams/AddMemberModal';
import { TeamFormModal } from '@/components/teams/TeamFormModal';
import { Button, ProgressBar, Tooltip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useManagedTeams } from '@/hooks/pages/useManagedTeams';
import { cn } from '@/lib/cn';

/**
 * Hairlines and padding per step: a single column on phones, 2 x 2 from `sm`, one row of four
 * from `xl` (outer steps flush with the page edges).
 */
const STEP_LAYOUT = [
  'border-b sm:border-r sm:pr-6 xl:border-b-0',
  'border-b sm:pl-6 xl:border-b-0 xl:border-r xl:px-6',
  'border-b sm:border-b-0 sm:border-r sm:pr-6 xl:px-6',
  'sm:pl-6',
];

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
      title: 'Add tasks',
      description: 'Break the work down, assign teammates and watch the board update live.',
      state: 'upcoming',
      action: <p className="text-xs text-fg-muted">Your new board opens right after step 03.</p>,
    },
  ];

  return (
    <section aria-labelledby="onboarding-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <h2
            id="onboarding-title"
            className="text-[15px] font-semibold tracking-[-0.005em] text-fg"
          >
            Set up your workspace
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            Four short steps, and your team can plan, track and ship together in real time.
          </p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-56">
          <ProgressBar
            value={(completed / steps.length) * 100}
            className="h-0.5 flex-1"
            label="Setup progress"
          />
          <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
            <span className="text-fg">{completed}</span>/{steps.length} done
          </span>
        </div>
      </div>

      <ol className="mt-6 grid border-y border-line sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <OnboardingStep
            key={step.title}
            step={step}
            number={index + 1}
            className={STEP_LAYOUT[index]}
          />
        ))}
      </ol>

      <p className="mt-6 text-xs leading-5 text-fg-muted">
        Joining an existing team instead? Ask one of its owners or admins to add you with{' '}
        <span className="font-mono text-fg">{user?.email}</span>.
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

/** One numbered step; the current one carries the vermilion marker on the top rule. */
function OnboardingStep({ step, number, className }) {
  const isDone = step.state === 'done';
  const isCurrent = step.state === 'current';

  return (
    <li className={cn('relative flex min-w-0 flex-col border-line py-6', className)}>
      {/* A short tick on phones (one column); the whole column's top rule once steps sit side by side. */}
      {isCurrent && (
        <span
          aria-hidden="true"
          className="absolute -top-px left-0 h-0.5 w-6 bg-brand-500 sm:right-0 sm:w-auto"
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'font-mono text-[13px] tabular-nums',
            isCurrent ? 'text-brand-700 dark:text-brand-400' : 'text-fg-muted',
          )}
        >
          <span className="sr-only">Step </span>
          {String(number).padStart(2, '0')}
        </span>
        {isDone && (
          <span className="eyebrow inline-flex items-center gap-1.5 text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Done
          </span>
        )}
        {isCurrent && <span className="eyebrow text-brand-700 dark:text-brand-400">Up next</span>}
      </div>
      <h3
        className={cn(
          'mt-5 text-[15px] font-semibold tracking-[-0.005em]',
          isDone ? 'text-fg-muted' : 'text-fg',
        )}
      >
        {step.title}
      </h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-fg-muted">
        {step.description}
      </p>
      <div className="mt-5">{step.action}</div>
    </li>
  );
}
