import { useId, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Check,
  Info,
  Mail,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  UserSearch,
} from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Avatar, Button, FormField, Input, Modal, Skeleton, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAddMember } from '@/hooks/queries/teams';
import { useUserSearch } from '@/hooks/queries/users';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/cn';
import { TEAM_ROLES } from '@/lib/constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SEARCH_LENGTH = 2;
/** The API returns at most this many users per search. */
const SEARCH_LIMIT = 8;
const ROLE_OPTIONS = TEAM_ROLES.filter((role) => role.value !== 'owner');
const MEMBER_ROLE_ONLY = ROLE_OPTIONS.filter((role) => role.value === 'member');
const ROLE_ICONS = { admin: ShieldCheck, member: UserRound };
/** Seeded demo accounts, offered as one-click suggestions to whoever explores the demo. */
const DEMO_EMAILS = ['priya', 'aarav', 'rahul', 'sneha', 'karan'].map(
  (name) => `${name}@example.com`,
);

/**
 * Adds an existing TaskFlow user to `team`. The search matches teammates (people sharing a
 * team with you) by name or email, anyone else only by their exact email address (API rule);
 * people already in the team are hidden. Only the owner may add someone as an admin.
 */
export function AddMemberModal({ open, ...props }) {
  if (!open) return null;
  return <AddMemberDialog {...props} />;
}

function AddMemberDialog({ team, onClose }) {
  const formId = useId();
  const listboxId = useId();
  const inputRef = useRef(null);
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [refocusSearch, setRefocusSearch] = useState(false);
  const addMember = useAddMember(team._id);
  const isOwner = team.myRole === 'owner';
  const roleOptions = isOwner ? ROLE_OPTIONS : MEMBER_ROLE_ONLY;

  const term = useDebounce(query.trim(), 250);
  const searching = !selectedUser && term.length >= MIN_SEARCH_LENGTH;
  const search = useUserSearch(searching ? term : '', { excludeTeam: team._id });
  const results = searching ? (search.data ?? []) : [];
  const loadingResults = search.isLoading || (search.isFetching && results.length === 0);

  const typedEmail = EMAIL_PATTERN.test(query.trim()) ? query.trim().toLowerCase() : '';
  const email = selectedUser?.email ?? typedEmail;
  const activeIndex = results.findIndex((user) => user._id === activeId);
  const activeUser = results[activeIndex === -1 ? 0 : activeIndex] ?? null;
  const showResults = searching && !error;
  // The combobox only "expands" when there is an actual list of options to move through.
  const listOpen = showResults && !loadingResults && results.length > 0;

  const memberEmails = new Set(
    (team.members ?? []).map((member) => member.user?.email?.toLowerCase()).filter(Boolean),
  );
  const demoEmails = DEMO_EMAILS.filter(
    (demoEmail) => !memberEmails.has(demoEmail) && demoEmail !== me?.email?.toLowerCase(),
  );

  // Known without asking the server: the typed address belongs to a member already, or the
  // finished search for exactly that address found no one (it would match any such account).
  const existingMember = typedEmail
    ? team.members?.find((member) => member.user?.email?.toLowerCase() === typedEmail)
    : null;
  const searchSettled =
    term.toLowerCase() === typedEmail && search.isSuccess && !search.isFetching;
  const knownMissing =
    Boolean(typedEmail) &&
    !existingMember &&
    searchSettled &&
    results.length < SEARCH_LIMIT &&
    !results.some((user) => user.email?.toLowerCase() === typedEmail);
  let localProblem = null;
  if (!selectedUser && existingMember) {
    localProblem = `${existingMember.user.name} is already a member of this team.`;
  } else if (!selectedUser && knownMissing) {
    localProblem = `No account found for ${typedEmail}. Ask them to sign up first.`;
  }

  const pick = (user) => {
    setSelectedUser(user);
    setQuery('');
    setError('');
  };

  const clearSelection = () => {
    setSelectedUser(null);
    setRefocusSearch(true);
  };

  const changeQuery = (value) => {
    setQuery(value);
    setActiveId(null);
    setError('');
  };

  const handleKeyDown = (event) => {
    if (!listOpen) return;
    const index = activeIndex === -1 ? 0 : activeIndex;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveId(results[(index + step + results.length) % results.length]._id);
    } else if (event.key === 'Enter' && activeUser) {
      event.preventDefault();
      pick(activeUser);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email) {
      setError('Pick someone from the results or enter their exact email address.');
      return;
    }
    if (localProblem) {
      setError(localProblem);
      return;
    }
    addMember.mutate(
      { email, role },
      {
        onSuccess: (updatedTeam) => {
          const added = updatedTeam?.members?.find((member) => member.user?.email === email);
          const name = selectedUser?.name ?? added?.user?.name ?? email;
          toast.success(`${name} was added to ${team.name}`);
          onClose();
        },
        onError: (mutationError) => {
          setError(getErrorMessage(mutationError, 'Could not add this person. Please try again.'));
        },
      },
    );
  };

  const showDemoEmails = !selectedUser && !query.trim() && demoEmails.length > 0;
  const typing = query.trim().length >= MIN_SEARCH_LENGTH;
  const hint =
    selectedUser || typing || showDemoEmails
      ? undefined
      : 'Type at least two characters to search.';

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!addMember.isPending}
      title={`Add people to ${team.name}`}
      description={
        // A block of its own so `text-pretty` can keep the last line from being a lone word.
        <span className="block text-pretty">
          Search your teammates by name, or enter the exact email of anyone with a TaskFlow
          account.
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={addMember.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            icon={UserPlus}
            loading={addMember.isPending}
            disabled={!email}
          >
            Add to team
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormField label="Person" error={error} hint={hint} required>
          {selectedUser ? (
            <SelectedUser user={selectedUser} onClear={clearSelection} />
          ) : (
            <Input
              ref={inputRef}
              icon={Search}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Teammate’s name or exact email address"
              autoComplete="off"
              spellCheck={false}
              autoFocus={refocusSearch}
              data-autofocus
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={listOpen}
              aria-controls={listOpen ? listboxId : undefined}
              aria-activedescendant={
                listOpen && activeUser ? `${listboxId}-${activeUser._id}` : undefined
              }
              trailing={
                search.isFetching ? <Spinner size="sm" className="mr-1.5 text-fg-subtle" /> : null
              }
            />
          )}

          {showResults && (
            <SearchResults
              listboxId={listboxId}
              term={term}
              results={results}
              activeId={activeUser?._id}
              typedEmail={typedEmail}
              memberName={existingMember?.user?.name}
              loading={loadingResults}
              onPick={pick}
              onHover={setActiveId}
            />
          )}

          {showDemoEmails && (
            <DemoSuggestions
              emails={demoEmails}
              onChoose={(demoEmail) => {
                changeQuery(demoEmail);
                // The suggestions disappear once there is a query: keep focus in the field.
                inputRef.current?.focus();
              }}
            />
          )}
        </FormField>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-fg">Role</legend>
          <div className={cn('grid gap-2.5', roleOptions.length > 1 && 'sm:grid-cols-2')}>
            {roleOptions.map((option) => (
              <RoleOption
                key={option.value}
                option={option}
                checked={role === option.value}
                onChange={setRole}
              />
            ))}
          </div>
          {!isOwner && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-fg-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Only the team owner can add people as admins.
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

/** One-click demo addresses (filled into the search, which then finds the account). */
function DemoSuggestions({ emails, onChoose }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="mr-0.5 text-xs text-fg-muted">Demo accounts:</span>
      {emails.map((email) => (
        <button
          key={email}
          type="button"
          onClick={() => onChoose(email)}
          className="focus-ring inline-flex h-7 items-center rounded-full border border-line bg-surface-muted px-2.5 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-surface-hover hover:text-fg"
        >
          {email}
        </button>
      ))}
    </div>
  );
}

function SearchResults({
  listboxId,
  term,
  results,
  activeId,
  typedEmail,
  memberName,
  loading,
  onPick,
  onHover,
}) {
  if (loading) {
    return (
      <div className="space-y-1 rounded-xl border border-line p-1.5" aria-hidden="true">
        {[0, 1].map((index) => (
          <div key={index} className="flex items-center gap-3 px-2.5 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-sm"
      >
        <UserSearch className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <p className="text-pretty text-fg-muted">
          {memberName ? (
            <>
              <span className="font-medium text-fg">{memberName}</span> is already in this team.
            </>
          ) : typedEmail ? (
            <>
              No TaskFlow account uses <span className="font-medium text-fg">{typedEmail}</span>{' '}
              yet. Ask them to sign up first.
            </>
          ) : (
            <>
              None of your teammates match{' '}
              <span className="font-medium text-fg">“{term}”</span>. To add someone else, enter
              their exact email address.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Matching people"
      className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain rounded-xl border border-line p-1.5"
    >
      {results.map((user) => {
        const active = user._id === activeId;
        return (
          <li
            key={user._id}
            id={`${listboxId}-${user._id}`}
            role="option"
            aria-selected={active}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(user._id)}
            onClick={() => onPick(user)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
              active ? 'bg-surface-hover' : 'hover:bg-surface-hover',
            )}
          >
            <Avatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>
            {user.title && (
              <span className="hidden max-w-[9rem] truncate text-xs text-fg-muted sm:block">
                {user.title}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SelectedUser({ user, onClear }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
      <Avatar user={user} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
          <Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span className="truncate">{user.email}</span>
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Change
      </Button>
    </div>
  );
}

function RoleOption({ option, checked, onChange }) {
  const Icon = ROLE_ICONS[option.value];

  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors duration-150',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/60',
        checked
          ? 'border-brand-500 bg-brand-50/60 dark:border-brand-400/70 dark:bg-brand-500/10'
          : 'border-line hover:border-line-strong hover:bg-surface-hover',
      )}
    >
      <input
        type="radio"
        name="member-role"
        value={option.value}
        checked={checked}
        onChange={() => onChange(option.value)}
        className="sr-only"
      />
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          checked
            ? 'bg-brand-600 text-white dark:bg-brand-500'
            : 'bg-surface-muted text-fg-muted ring-1 ring-inset ring-line',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 pr-5">
        <span className="block text-sm font-medium text-fg">{option.label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
          {option.description}
        </span>
      </span>
      {checked && (
        <Check
          className="absolute right-3 top-3 h-4 w-4 text-brand-600 dark:text-brand-300"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
    </label>
  );
}
