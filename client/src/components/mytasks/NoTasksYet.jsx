import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { TeamFormModal } from '@/components/teams/TeamFormModal';
import { Button, EmptyState } from '@/components/ui';
import { useManagedTeams } from '@/hooks/pages/useManagedTeams';
import { TaskResultsSkeleton } from './TaskResultsSkeleton';

/**
 * Empty results of an unfiltered view ("my open tasks" or "all tasks"). Rather than "nothing
 * matches your filters" it says why the list is empty and offers the next step: create a team,
 * then a project, or browse everyone's tasks once there is work around.
 * `projects` = every project the user can access (undefined while loading).
 */
export function NoTasksYet({ assignedToMe, projects, onShowAll }) {
  const navigate = useNavigate();
  const { teams, managedTeams, isLoading: teamsLoading } = useManagedTeams();
  const [dialog, setDialog] = useState(null); // 'team' | 'project'

  if (!projects || teamsLoading) return <TaskResultsSkeleton rows={3} />;

  const title = assignedToMe ? 'Nothing assigned to you yet' : 'No tasks yet';
  let content;
  if (projects.length > 0) {
    content = assignedToMe ? (
      <EmptyState
        title="You’re all caught up"
        description="No open tasks are assigned to you right now. New assignments show up here as soon as they’re made."
        action={
          <Button variant="secondary" onClick={onShowAll}>
            Browse all tasks
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={title}
        description="Your projects don’t have any tasks yet. Open a board to add the first one."
        action={
          <Button as={Link} to="/projects" variant="secondary">
            Go to projects
          </Button>
        }
      />
    );
  } else if (teams.length === 0) {
    content = (
      <EmptyState
        title={title}
        description="Tasks live in projects, and projects belong to teams. Create a team to get started, or ask a teammate to add you to theirs."
        action={
          <Button icon={Plus} onClick={() => setDialog('team')}>
            Create a team
          </Button>
        }
      />
    );
  } else {
    const canCreate = managedTeams.length > 0;
    content = (
      <EmptyState
        title={title}
        description={
          canCreate
            ? 'Create your team’s first project, then add tasks to its board.'
            : 'Your teams don’t have any projects yet. A team owner or admin can create the first one.'
        }
        action={
          canCreate && (
            <Button icon={Plus} onClick={() => setDialog('project')}>
              Create a project
            </Button>
          )
        }
      />
    );
  }

  return (
    <>
      {content}
      <TeamFormModal
        open={dialog === 'team'}
        onClose={() => setDialog(null)}
        onSaved={(team) => navigate(`/teams/${team._id}`)}
      />
      <ProjectFormModal
        open={dialog === 'project'}
        onClose={() => setDialog(null)}
        defaultTeamId={managedTeams[0]?._id}
      />
    </>
  );
}
