import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Plus, Users } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { TeamFormModal } from '@/components/teams/TeamFormModal';
import {
  Alert,
  Button,
  ColorPicker,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ui';
import { useManagedTeams } from '@/hooks/pages/useManagedTeams';
import { useCreateProject, useProjects, useUpdateProject } from '@/hooks/queries/projects';
import { PROJECT_COLORS } from '@/lib/constants';
import { getId } from '@/lib/ids';
import { ProjectTile } from './ProjectTile';

const KEY_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/;
const KEY_MAX = 6;
const DESCRIPTION_MAX = 1000;
const ALL_PROJECTS = { status: 'all' };

/** Mirrors the API rules: name 2-100, key 2-6 chars starting with a letter, description ≤ 1000. */
const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be at most 100 characters'),
  key: z
    .string()
    .trim()
    .min(1, 'Key is required')
    .regex(KEY_PATTERN, 'Use 2–6 letters or digits, starting with a letter'),
  team: z.string().min(1, 'Choose a team'),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
  color: z.string().regex(/^#[\da-f]{6}$/i, 'Pick a colour'),
});

/** Keeps only what a key may contain: upper-case letters and digits, at most 6. */
const cleanKey = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, KEY_MAX);

/**
 * Key suggestion from a project name: initials of a multi-word name ("Website Relaunch" -> WR),
 * the start of a single word ("Marketing" -> MAR, "Site" -> SITE), made unique in the team by a
 * numeric suffix ("WEB" -> "WEB2").
 */
function suggestKey(name, takenKeys) {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => /^[A-Z]/.test(word));
  if (words.length === 0) return '';

  const base =
    words.length > 1
      ? words
          .slice(0, 4)
          .map((word) => word[0])
          .join('')
      : words[0].slice(0, words[0].length <= 4 ? 4 : 3);
  if (base.length < 2 || !takenKeys.has(base)) return base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base.slice(0, KEY_MAX - String(suffix).length)}${suffix}`;
    if (!takenKeys.has(candidate)) return candidate;
  }
  return base;
}

const randomColor = () => PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

/**
 * Create a project in a team the user manages, or edit one (`project` given; its team is fixed).
 * After a creation without `onSaved`, the new board opens.
 */
export function ProjectFormModal({ open, ...props }) {
  if (!open) return null;
  return <ProjectFormDialog {...props} />;
}

function ProjectFormDialog({ onClose, project, defaultTeamId, onSaved }) {
  const isEdit = Boolean(project);
  const navigate = useNavigate();
  const formId = useId();
  const [formError, setFormError] = useState('');
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [initialColor] = useState(() => project?.color ?? randomColor());
  const keyEditedRef = useRef(isEdit);

  const { managedTeams, isLoading: teamsLoading } = useManagedTeams();
  const { data: allProjects } = useProjects(ALL_PROJECTS);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(project?._id);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitted, isDirty },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      team: isEdit ? (getId(project.team) ?? '') : '',
      description: project?.description ?? '',
      color: initialColor,
    },
    mode: 'onTouched',
  });

  const [name, key, teamId, description, color] = watch([
    'name',
    'key',
    'team',
    'description',
    'color',
  ]);

  // Preselect `defaultTeamId` (or the first managed team) once the teams are known.
  useEffect(() => {
    if (isEdit || getValues('team') || managedTeams.length === 0) return;
    const preferred = managedTeams.find((team) => team._id === defaultTeamId) ?? managedTeams[0];
    setValue('team', preferred._id);
  }, [isEdit, managedTeams, defaultTeamId, getValues, setValue]);

  const takenKeys = useMemo(
    () =>
      new Set(
        (allProjects ?? [])
          .filter((item) => getId(item.team) === teamId && item._id !== project?._id)
          .map((item) => item.key),
      ),
    [allProjects, teamId, project?._id],
  );

  // Suggest a key from the name until the user types their own.
  useEffect(() => {
    if (keyEditedRef.current) return;
    setValue('key', suggestKey(name, takenKeys), { shouldValidate: isSubmitted });
  }, [name, takenKeys, isSubmitted, setValue]);

  const keyField = register('key', {
    onChange: (event) => {
      const cleaned = cleanKey(event.target.value);
      keyEditedRef.current = cleaned.length > 0;
      if (cleaned !== event.target.value) {
        setValue('key', cleaned, { shouldDirty: true, shouldValidate: isSubmitted });
      }
    },
  });

  const colors = PROJECT_COLORS.includes(initialColor)
    ? PROJECT_COLORS
    : [initialColor, ...PROJECT_COLORS];
  const teamName = isEdit
    ? project.team?.name
    : managedTeams.find((team) => team._id === teamId)?.name;
  const needsTeam = !isEdit && !teamsLoading && managedTeams.length === 0;

  const onSubmit = async (values) => {
    setFormError('');
    if (takenKeys.has(values.key)) {
      setError(
        'key',
        { type: 'duplicate', message: `${values.key} is already used by another project here` },
        { shouldFocus: true },
      );
      return;
    }

    const payload = {
      name: values.name,
      key: values.key,
      description: values.description,
      color: values.color,
    };
    try {
      const saved = isEdit
        ? await updateProject.mutateAsync(payload)
        : await createProject.mutateAsync({ ...payload, team: values.team });
      toast.success(isEdit ? 'Project updated' : `Project “${saved.name}” created`);
      onClose();
      if (onSaved) onSaved(saved);
      else if (!isEdit) navigate(`/projects/${saved._id}`);
    } catch (error) {
      if (error?.response?.status === 409) {
        setError('key', { type: 'server', message: getErrorMessage(error) }, { shouldFocus: true });
      } else if (!applyFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Could not save the project. Please try again.'));
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!isSubmitting}
      title={isEdit ? 'Edit project' : 'New project'}
      description={
        isEdit
          ? `Update the details of ${project.name}.`
          : 'A project holds a team’s board, tasks and activity.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={needsTeam || (isEdit && !isDirty)}
          >
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      {needsTeam ? (
        <EmptyState
          compact
          icon={Users}
          title="You don’t manage a team yet"
          description="Projects belong to a team and only its owners and admins can create them. Start your own team, you’ll be its owner."
          action={
            <Button icon={Plus} onClick={() => setTeamModalOpen(true)}>
              Create a team
            </Button>
          }
        />
      ) : (
        <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && <Alert variant="error">{formError}</Alert>}

          {/* Live preview of the project's identity: key, colour, name and team. */}
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted/50 p-3">
            <ProjectTile projectKey={key || '?'} color={color} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">
                {name.trim() || 'Untitled project'}
              </p>
              <p className="truncate text-xs text-fg-muted">
                {teamName ?? (teamsLoading ? 'Loading teams…' : 'No team selected')}
              </p>
            </div>
          </div>

          <FormField label="Project name" error={errors.name?.message} required>
            <Input
              placeholder="e.g. Website relaunch"
              autoComplete="off"
              maxLength={100}
              data-autofocus
              {...register('name')}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
            <FormField
              label="Key"
              error={errors.key?.message}
              hint={
                isEdit ? (
                  'Renames every task ID.'
                ) : (
                  <>
                    Task IDs: <span className="font-mono">{key || 'KEY'}-1</span>,{' '}
                    <span className="font-mono">{key || 'KEY'}-2</span>
                  </>
                )
              }
              required
            >
              <Input
                placeholder="WEB"
                autoComplete="off"
                spellCheck={false}
                maxLength={KEY_MAX}
                className="font-mono uppercase tracking-wider"
                {...keyField}
              />
            </FormField>

            <FormField
              label="Team"
              error={errors.team?.message}
              hint={isEdit ? 'Projects stay in the team they were created in.' : undefined}
              required
            >
              {isEdit ? (
                <Select value={teamId} disabled>
                  <option value={teamId}>{project.team?.name ?? 'Team'}</option>
                </Select>
              ) : (
                <Select disabled={teamsLoading} {...register('team')}>
                  {teamsLoading && <option value="">Loading teams…</option>}
                  {managedTeams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>

          <FormField
            label="Description"
            error={errors.description?.message}
            action={
              <span className="font-mono text-[11px] tabular-nums text-fg-muted">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            }
          >
            <Textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              placeholder="What is this project about? Goals, scope, links…"
              {...register('description')}
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-[13px] font-medium text-fg">Colour</p>
            <ColorPicker
              value={color}
              colors={colors}
              aria-label="Project colour"
              onChange={(value) => setValue('color', value, { shouldDirty: true })}
            />
          </div>
        </form>
      )}

      <TeamFormModal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} />
    </Modal>
  );
}
