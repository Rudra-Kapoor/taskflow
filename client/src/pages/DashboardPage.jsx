import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDot } from 'lucide-react';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { OnboardingCard } from '@/components/dashboard/OnboardingCard';
import { PriorityChart, PriorityChartSkeleton } from '@/components/dashboard/PriorityChart';
import { ProjectsOverview } from '@/components/dashboard/ProjectsOverview';
import { StatCard, StatCardSkeleton } from '@/components/dashboard/StatCard';
import { StatusChart, StatusChartSkeleton } from '@/components/dashboard/StatusChart';
import { UpcomingTasks, UpcomingTasksSkeleton } from '@/components/dashboard/UpcomingTasks';
import { Button, Card, ErrorState, PageHeader } from '@/components/ui';
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
  if (!assignedOpen) return 'You’re all caught up. Nice work!';
  const open = `You have ${pluralize(assignedOpen, 'open task')}`;
  if (overdue) return `${open}, ${overdue} of them overdue.`;
  if (dueToday) return `${open}, ${dueToday} due today.`;
  return `${open} on your plate.`;
}

function getStatCards(stats) {
  return [
    {
      label: 'Open tasks',
      value: stats.assignedOpen,
      hint: 'Assigned to you',
      icon: CircleDot,
      tone: 'brand',
      to: '/tasks?assignee=me&status=open',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      hint: stats.overdue ? 'Needs your attention' : 'Nothing overdue',
      icon: AlertTriangle,
      tone: stats.overdue ? 'rose' : 'neutral',
      to: '/tasks?assignee=me&due=overdue&sort=due_asc',
    },
    {
      label: 'Due today',
      value: stats.dueToday,
      hint: stats.dueToday ? 'Due before midnight' : 'Nothing due today',
      icon: CalendarClock,
      tone: 'amber',
      to: '/tasks?assignee=me&status=open&due=today&sort=due_asc',
    },
    {
      // "Completed" keeps the label on one line in the narrow four-up cards.
      label: 'Completed',
      value: stats.completedThisWeek,
      hint: 'In the last 7 days',
      icon: CheckCircle2,
      tone: 'emerald',
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

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        description={
          <>
            <span className="font-medium text-fg">{format(new Date(), 'EEEE, MMMM d')}</span>
            <span className="mx-2 text-fg-subtle" aria-hidden="true">
              ·
            </span>
            {describeWorkload(stats)}
          </>
        }
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
          : getStatCards(data.stats).map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardCard
          title="Upcoming deadlines"
          description="Your open tasks, nearest due date first"
          className="lg:col-span-2"
          action={
            <Button
              as={Link}
              to="/tasks?assignee=me&status=open&sort=due_asc"
              variant="ghost"
              size="sm"
              iconRight={ArrowRight}
            >
              View all
            </Button>
          }
        >
          {loading ? <UpcomingTasksSkeleton /> : <UpcomingTasks tasks={data.upcomingTasks} />}
        </DashboardCard>

        <DashboardCard title="Tasks by status" description="All tasks in your active projects">
          {loading ? (
            <StatusChartSkeleton />
          ) : (
            <StatusChart breakdown={data.statusBreakdown} />
          )}
        </DashboardCard>
      </div>

      {/* Top-aligned: the feed grows with "Load more" without stretching its neighbour. */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <DashboardCard
          title="Recent activity"
          description="Latest changes across your teams"
          className="lg:col-span-2"
        >
          <ActivityFeed query={activity} showProject compact />
        </DashboardCard>

        <DashboardCard
          title="My open tasks by priority"
          description="Where your attention goes"
          className="lg:sticky lg:top-6"
        >
          {loading ? (
            <PriorityChartSkeleton />
          ) : (
            <PriorityChart breakdown={data.priorityBreakdown} />
          )}
        </DashboardCard>
      </div>

      <ProjectsOverview />
    </div>
  );
}
