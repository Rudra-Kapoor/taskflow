import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Crown } from 'lucide-react';
import { applyFieldErrors, getErrorMessage } from '@/api/client';
import { Alert, Button, FormField, Input, Modal, Textarea } from '@/components/ui';
import { useCreateTeam, useUpdateTeam } from '@/hooks/queries/teams';
import { TeamAvatar } from './TeamAvatar';

const DESCRIPTION_MAX = 500;

/** Mirrors the API rules: name 2-80 characters, description up to 500. */
const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Team name must be at least 2 characters')
    .max(80, 'Team name must be at most 80 characters'),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),
});

/**
 * Create a team (the creator becomes its owner) or edit one (`team` given).
 * Calls `onSaved(team)` after a successful save, then closes.
 */
export function TeamFormModal({ open, ...props }) {
  if (!open) return null;
  return <TeamFormDialog {...props} />;
}

function TeamFormDialog({ onClose, team, onSaved }) {
  const isEdit = Boolean(team);
  const formId = useId();
  const [formError, setFormError] = useState('');
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam(team?._id);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: team?.name ?? '', description: team?.description ?? '' },
    mode: 'onTouched',
  });

  const name = watch('name');
  const description = watch('description') ?? '';

  const onSubmit = async (values) => {
    setFormError('');
    try {
      const saved = isEdit
        ? await updateTeam.mutateAsync(values)
        : await createTeam.mutateAsync(values);
      toast.success(isEdit ? 'Team details updated' : `Team “${saved.name}” created`);
      onClose();
      onSaved?.(saved);
    } catch (error) {
      if (!applyFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Could not save the team. Please try again.'));
      }
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!isSubmitting}
      title={isEdit ? 'Edit team' : 'Create a team'}
      description={
        isEdit
          ? 'Update the name and description your teammates see.'
          : 'Teams bring people and their projects together.'
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
            disabled={isEdit && !isDirty}
          >
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}

        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted/60 p-3">
          {/* A new team's colour comes from its id, so the preview uses the brand gradient. */}
          <TeamAvatar
            team={{ _id: team?._id, name: name.trim() || 'New team' }}
            size="md"
            className={isEdit ? undefined : 'bg-gradient-to-br from-brand-500 to-violet-600'}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{name.trim() || 'New team'}</p>
            <p className="text-xs text-fg-muted">
              {isEdit ? 'Team preview' : 'You’ll be the owner and can invite members next.'}
            </p>
          </div>
          {!isEdit && (
            <Crown className="ml-auto h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
          )}
        </div>

        <FormField label="Team name" error={errors.name?.message} required>
          <Input
            placeholder="e.g. Product Engineering"
            autoComplete="off"
            maxLength={80}
            data-autofocus
            {...register('name')}
          />
        </FormField>

        <FormField
          label="Description"
          error={errors.description?.message}
          hint="Optional. What does this team work on?"
          action={
            <span className="text-xs tabular-nums text-fg-muted">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          }
        >
          <Textarea
            rows={3}
            placeholder="Designs, builds and ships the product…"
            maxLength={DESCRIPTION_MAX}
            {...register('description')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
