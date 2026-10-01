import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import {
  Alert,
  Button,
  EmptyState,
  FormField,
  Input,
  Kbd,
  Modal,
  Textarea,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useProject, useProjects } from '@/hooks/queries/projects';
import { useCreateTask } from '@/hooks/queries/tasks';
import { STATUS_META, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import { isApplePlatform } from '@/lib/dom';
import { getTaskKey } from '@/lib/format';
import { getId } from '@/lib/ids';
import { openTaskModal, taskBoardPath } from '@/lib/taskLinks';
import { AssigneeSelect } from './AssigneeSelect';
import { DueDatePicker } from './DueDatePicker';
import { LabelsInput, MAX_LABELS } from './LabelsInput';
import { PriorityPicker } from './PriorityPicker';
import { ProjectPicker } from './ProjectPicker';
import { StatusPicker } from './StatusPicker';

const taskSchema = z.object({
  project: z.string().min(1, 'Choose a project for the task'),
  title: z
    .string()
    .trim()
    .min(1, 'Give the task a title')
    .max(200, 'Keep the title under 200 characters'),
  description: z.string().max(5000, 'The description can be at most 5,000 characters'),
  status: z.enum(TASK_STATUSES.map((status) => status.value)),
  priority: z.enum(TASK_PRIORITIES.map((priority) => priority.value)),
  assignee: z.string(),
  dueDate: z.string().nullable(),
  labels: z.array(z.string()).max(MAX_LABELS, `A task can have at most ${MAX_LABELS} labels`),
});

/** Opens a created task: over its board when that is open (keeping filters), else on it. */
function openCreatedTask(navigate, task) {
  const projectId = getId(task.project);
  if (window.location.pathname === `/projects/${projectId}`) openTaskModal(navigate, task._id);
  else navigate(taskBoardPath(projectId, task._id));
}

/** Shown instead of the form when there is no project to put a task in. */
function NoProjectsDialog({ onClose }) {
  return (
    <Modal open onClose={onClose} size="sm" ariaLabel="New task">
      <EmptyState
        compact
        icon={FolderKanban}
        title="Create a project first"
        description="Tasks live in projects. Create one for your team (or ask a team owner or admin), then add tasks to it."
        action={
          <Button as={Link} to="/projects" onClick={onClose}>
            Go to projects
          </Button>
        }
      />
    </Modal>
  );
}

function TaskFormDialog({ onClose, projectId, defaultStatus, onCreated }) {
  const formId = useId();
  const navigate = useNavigate();
  const { user } = useAuth();
  const routeProjectId = useMatch('/projects/:projectId')?.params.projectId;
  const projectsQuery = useProjects();
  const createTask = useCreateTask();
  const [formError, setFormError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project: projectId ?? '',
      title: '',
      description: '',
      status: STATUS_META[defaultStatus] ? defaultStatus : 'todo',
      priority: 'medium',
      assignee: '',
      dueDate: null,
      labels: [],
    },
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const selectedProjectId = watch('project');
  const projectQuery = useProject(selectedProjectId || undefined);
  const members = useMemo(
    () => (projectQuery.data?.team?.members ?? []).map((member) => member.user).filter(Boolean),
    [projectQuery.data],
  );
  const projectName =
    projectQuery.data?.name ?? projects.find((project) => project._id === projectId)?.name;

  // Opened from a board through the top bar: preselect that project.
  useEffect(() => {
    if (projectId || getValues('project') || !routeProjectId) return;
    if (projects.some((project) => project._id === routeProjectId)) {
      setValue('project', routeProjectId);
    }
  }, [projectId, projects, routeProjectId, getValues, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const task = await createTask.mutateAsync({
        projectId: values.project,
        data: {
          title: values.title,
          description: values.description.trim(),
          status: values.status,
          priority: values.priority,
          assignee: values.assignee || null,
          dueDate: values.dueDate,
          labels: values.labels,
        },
      });
      toast.success(
        (t) => (
          <span className="flex items-center gap-3">
            <span>
              Created <span className="font-semibold">{getTaskKey(task)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                openCreatedTask(navigate, task);
              }}
              className="rounded font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              View
            </button>
          </span>
        ),
        { id: `task-created:${task._id}` },
      );
      onCreated?.(task);
      onClose();
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Could not create the task. Please try again.'));
      }
    }
  });

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  const noProjects = !projectId && !projectsQuery.isLoading && projects.length === 0;
  if (noProjects) return <NoProjectsDialog onClose={onClose} />;

  const statusLabel = defaultStatus ? STATUS_META[defaultStatus]?.label : null;
  let description = 'Choose a project and describe the work to be done.';
  if (projectId) {
    description = `Add a task to ${projectName ?? 'this project'}${
      statusLabel ? ` in “${statusLabel}”` : ''
    }.`;
  }
  const fieldId = (name) => `${formId}-${name}`;

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="block font-display text-[28px] font-normal leading-[1.1] tracking-[-0.01em]">
          New task
        </span>
      }
      description={description}
      size="lg"
      dismissible={!isSubmitting}
      footer={
        <>
          <span className="mr-auto hidden items-center gap-1 text-xs text-fg-muted sm:inline-flex">
            <Kbd>{isApplePlatform() ? '⌘' : 'Ctrl'}</Kbd>
            <Kbd>Enter</Kbd>
            <span className="ml-1">to create</span>
          </span>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            Create task
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={onSubmit}
        onKeyDown={handleKeyDown}
        noValidate
        className="space-y-5"
      >
        {formError && <Alert variant="error">{formError}</Alert>}

        {!projectId && (
          <FormField
            label="Project"
            htmlFor={fieldId('project')}
            required
            error={errors.project?.message}
          >
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <ProjectPicker
                  id={fieldId('project')}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    // Assignees are team members: start over for another project.
                    setValue('assignee', '');
                  }}
                  projects={projects}
                  loading={projectsQuery.isLoading}
                />
              )}
            />
          </FormField>
        )}

        <FormField label="Title" required error={errors.title?.message}>
          <Input
            data-autofocus
            placeholder="e.g. Add a password reset flow"
            maxLength={200}
            autoComplete="off"
            {...register('title')}
          />
        </FormField>

        <FormField label="Description" error={errors.description?.message}>
          <Textarea
            rows={4}
            maxLength={5000}
            placeholder="Add more detail: context, acceptance criteria, links…"
            {...register('description')}
          />
        </FormField>

        <section
          aria-labelledby={fieldId('details')}
          className="space-y-4 border-t border-line pt-5"
        >
          <h3
            id={fieldId('details')}
            className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-fg-muted"
          >
            Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor={fieldId('status')}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <StatusPicker id={fieldId('status')} value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
            <FormField label="Priority" htmlFor={fieldId('priority')}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <PriorityPicker
                    id={fieldId('priority')}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField
              label="Assignee"
              htmlFor={fieldId('assignee')}
              error={errors.assignee?.message}
              hint={selectedProjectId ? undefined : 'Pick a project first'}
            >
              <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                  <AssigneeSelect
                    id={fieldId('assignee')}
                    value={field.value}
                    onChange={field.onChange}
                    members={members}
                    currentUserId={user?._id}
                    loading={projectQuery.isLoading}
                    disabled={!selectedProjectId}
                  />
                )}
              />
            </FormField>
            <FormField label="Due date" htmlFor={fieldId('due')} error={errors.dueDate?.message}>
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <DueDatePicker id={fieldId('due')} value={field.value} onChange={field.onChange} />
                )}
              />
            </FormField>
          </div>

          <FormField
            label="Labels"
            htmlFor={fieldId('labels')}
            error={errors.labels?.message}
            hint="Press Enter or comma to add a label."
          >
            <Controller
              name="labels"
              control={control}
              render={({ field }) => (
                <LabelsInput
                  id={fieldId('labels')}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. frontend, bug"
                />
              )}
            />
          </FormField>
        </section>
      </form>
    </Modal>
  );
}

/**
 * "New task" dialog. Props: `open`, `onClose`, `projectId?` (shows a project picker when absent),
 * `defaultStatus?`, `onCreated?(task)`. The form starts fresh every time it opens.
 */
export function TaskFormModal({ open, onClose, projectId, defaultStatus, onCreated }) {
  if (!open) return null;
  return (
    <TaskFormDialog
      onClose={onClose}
      projectId={projectId}
      defaultStatus={defaultStatus}
      onCreated={onCreated}
    />
  );
}
