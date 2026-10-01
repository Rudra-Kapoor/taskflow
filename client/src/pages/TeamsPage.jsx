import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { TeamCard, TeamCardSkeleton } from '@/components/teams/TeamCard';
import { TeamFormModal } from '@/components/teams/TeamFormModal';
import { Button, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useTeams } from '@/hooks/queries/teams';

/** `grid-cols-1` (minmax(0, 1fr)) keeps long team names from stretching cards past the screen. */
const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3';

/** Every team the user belongs to; new teams open on their page so members can be added. */
export function TeamsPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: teams = [], isLoading, isError, error, refetch } = useTeams();
  useDocumentTitle('Teams');

  let content;
  if (isLoading) {
    content = (
      <div className={GRID}>
        {Array.from({ length: 3 }, (_, index) => (
          <TeamCardSkeleton key={index} />
        ))}
      </div>
    );
  } else if (isError && teams.length === 0) {
    content = (
      <Card>
        <ErrorState title="Couldn’t load your teams" error={error} onRetry={refetch} />
      </Card>
    );
  } else if (teams.length === 0) {
    content = (
      <Card>
        <EmptyState
          icon={Users}
          title="You’re not in a team yet"
          description="Teams group people and their projects. Create one and invite your colleagues by email, or ask a team admin to add you."
          action={
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              Create a team
            </Button>
          }
        />
      </Card>
    );
  } else {
    content = (
      <div className={GRID}>
        {teams.map((team) => (
          <TeamCard key={team._id} team={team} />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        icon={Users}
        title="Teams"
        description="The teams you belong to and the people in them."
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New team
          </Button>
        }
      />

      {content}

      <TeamFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(team) => navigate(`/teams/${team._id}`)}
      />
    </div>
  );
}
