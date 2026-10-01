import { format } from 'date-fns';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { DashboardSection, SectionLink } from '@/components/dashboard/DashboardSection';
import { OnboardingCard } from '@/components/dashboard/OnboardingCard';
import { PriorityChart, PriorityChartSkeleton } from '@/components/dashboard/PriorityChart';
import { ProjectsOverview } from '@/components/dashboard/ProjectsOverview';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { StatusChart, StatusChartSkeleton } from '@/components/dashboard/StatusChart';
import { UpcomingTasks, UpcomingTasksSkeleton } from '@/components/dashboard/UpcomingTasks';
import { Card, ErrorState, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useActivityFeed } from '@/hooks/queries/activity';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useDashboard } from '@/hooks/queries/dashboard';
import { getFirstName, pluralize } from '@/lib/format';

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** A brand-new workspace (no team or no active project yet) gets the onboarding guide. */
const needsOnboarding = (stats) => Boolean(stats) && (stats.teams === 0 || stats.projects === 0);

/** One-line status under the greeting, e.g. "You have 9 open tasks, 2 of them overdue." */
function describeWorkload(stats) {
  if (!stats) return 'Here’s what’s happening across your teams.';
  if (needsOnboarding(stats)) return 'Let’s get your workspace ready.';
  const { assignedOpen, overdue, dueToday } = stats;
  if (!assignedOpen) return 'You’re all caught up. Nothing assigned to you is open.';
  const open = `You have ${pluralize(assignedOpen, 'open task')}`;
  if (overdue) return `${open}, ${overdue} of them overdue.`;
  if (dueToday) return `${open}, ${dueToday} due today.`;
  return `${open} on your plate.`;
}

/** The headline figures; each opens My tasks filtered to exactly that number. */
function getStats(stats) {
  return [
    {
      label: 'Open tasks',
      value: stats.assignedOpen,
      hint: 'Assigned to you',
      to: '/tasks?assignee=me&status=open',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      hint: stats.overdue ? 'Needs your attention' : 'Nothing overdue',
      alert: stats.overdue > 0,
      to: '/tasks?assignee=me&due=overdue&sort=due_asc',
    },
    {
      label: 'Due today',
      value: stats.dueToday,
      hint: stats.dueToday ? 'Due before midnight' : 'Nothing due today',
      to: '/tasks?assignee=me&status=open&due=today&sort=due_asc',
    },
    {
      label: 'Completed',
      value: stats.completedThisWeek,
      hint: 'In the last 7 days',
      to: '/tasks?assignee=me&status=completed&completedWithin=7',
    },
  ];
}

/** Activity entries per page; "Load more" below the list fetches the next ones. */
const ACTIVITY_PAGE_SIZE = 6;

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard();
  useDocumentTitle('Dashboard');
  const stats = data?.stats;
  const firstName = getFirstName(user?.name);
  const today = new Date();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow={
          <time dateTime={format(today, 'yyyy-MM-dd')}>
            {format(today, "EEEE, MMMM d '·' 'Week' I")}
          </time>
        }
        title={`${getGreeting(today)}${firstName ? `, ${firstName}` : ''}`}
        description={describeWorkload(stats)}
      />

      {isError && !data ? (
        <Card>
          <ErrorState title="Couldn’t load your dashboard" error={error} onRetry={refetch} />
        </Card>
      ) : needsOnboarding(stats) ? (
        <OnboardingCard stats={stats} />
      ) : (
        <Overview data={data} loading={isLoading} />
      )}
    </div>
  );
}

function Overview({ data, loading }) {
  const activity = useActivityFeed({ limit: ACTIVITY_PAGE_SIZE });

  return (
    <div className="space-y-10 sm:space-y-12">
      <StatStrip items={loading ? undefined : getStats(data.stats)} loading={loading} />

      {/*
       * Main column (2/3): deadlines, then the activity feed. The narrow column (1/3) spans both
       * rows so neither column leaves a gap; on phones it comes between deadlines and the feed.
       */}
      <div className="grid gap-x-12 gap-y-10 sm:gap-y-12 lg:grid-cols-3 lg:items-start xl:gap-x-16">
        <DashboardSection
          title="Upcoming deadlines"
          description="Your open tasks, nearest due date first"
          action={<SectionLink to="/tasks?assignee=me&status=open&sort=due_asc" />}
          className="lg:col-span-2"
        >
          {loading ? <UpcomingTasksSkeleton /> : <UpcomingTasks tasks={data.upcomingTasks} />}
        </DashboardSection>

        <div className="space-y-10 sm:space-y-12 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <DashboardSection title="Tasks by status" description="All tasks in your active projects">
            {loading ? (
              <StatusChartSkeleton />
            ) : (
              <StatusChart breakdown={data.statusBreakdown} />
            )}
          </DashboardSection>

          <DashboardSection title="My open tasks by priority" description="Where your attention goes">
            {loading ? (
              <PriorityChartSkeleton />
            ) : (
              <PriorityChart breakdown={data.priorityBreakdown} />
            )}
          </DashboardSection>

          <ProjectsOverview />
        </div>

        <DashboardSection
          title="Recent activity"
          description="Latest changes across your teams"
          className="lg:col-span-2"
        >
          <div className="pt-2">
            <ActivityFeed query={activity} showProject compact />
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}
