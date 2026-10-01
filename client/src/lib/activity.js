import {
  Activity,
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  CheckCircle2,
  FolderPlus,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { PRIORITY_META, ROLE_META, STATUS_META } from './constants';
import { formatShortDate } from './format';

/** Soft background + foreground classes for the small action icon shown next to an avatar. */
const TONES = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  red: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
};

const FIELD_LABELS = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  dueDate: 'due date',
  labels: 'labels',
  assignee: 'assignee',
  status: 'status',
  name: 'name',
  key: 'key',
  color: 'colour',
};

const fieldLabel = (field) => FIELD_LABELS[field] ?? humanize(field).toLowerCase();
const statusLabel = (value) => STATUS_META[value]?.label ?? humanize(value);
const priorityLabel = (value) => PRIORITY_META[value]?.label ?? humanize(value);
const roleLabel = (value) => ROLE_META[value]?.label ?? humanize(value);
const quote = (value) => `“${value}”`;
const withArticle = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

/** "in_progress" -> "In progress", "member_added" -> "Member added". */
function humanize(value) {
  if (value === null || value === undefined) return '';
  const text = String(value)
    .replace(/[._-]+/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** ["a"] -> "a", ["a", "b"] -> "a and b", ["a", "b", "c"] -> "a, b and c". */
export function joinList(items) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

const uniqueList = (items) => [...new Set(items.filter(Boolean))];

function taskTarget(meta) {
  return [meta.taskKey, meta.taskTitle].filter(Boolean).join(' ') || 'a task';
}

function fromTo(from, to, toLabel) {
  if (from && to) return `from ${toLabel(from)} to ${toLabel(to)}`;
  if (to) return `to ${toLabel(to)}`;
  return null;
}

function labelPhrase(labels) {
  const quoted = labels.map(quote);
  return labels.length === 1 ? `the label ${quoted[0]}` : `the labels ${joinList(quoted)}`;
}

function describeTaskUpdate(meta) {
  const target = taskTarget(meta);
  const changes = Array.isArray(meta.changes) ? meta.changes : [];

  if (changes.length === 0) return { verb: 'updated', target };
  if (changes.length > 1) {
    const fields = uniqueList(changes.map((change) => fieldLabel(change.field)));
    return { verb: `updated the ${joinList(fields)} of`, target };
  }

  const [{ field, from, to }] = changes;
  switch (field) {
    case 'title':
      return { verb: from ? `renamed ${quote(from)} to` : 'renamed', target };
    case 'description':
      return { verb: 'updated the description of', target };
    case 'priority':
      return { verb: 'changed the priority of', target, detail: fromTo(from, to, priorityLabel) };
    case 'dueDate':
      if (!to) return { verb: 'removed the due date from', target };
      if (!from)
        return { verb: 'set the due date of', target, detail: `to ${formatShortDate(to)}` };
      return {
        verb: 'changed the due date of',
        target,
        detail: `from ${formatShortDate(from)} to ${formatShortDate(to)}`,
      };
    case 'labels': {
      const before = Array.isArray(from) ? from : [];
      const after = Array.isArray(to) ? to : [];
      const added = after.filter((label) => !before.includes(label));
      const removed = before.filter((label) => !after.includes(label));
      if (added.length && !removed.length)
        return { verb: `added ${labelPhrase(added)} to`, target };
      if (removed.length && !added.length) {
        return { verb: `removed ${labelPhrase(removed)} from`, target };
      }
      const parts = [
        added.length ? `added ${added.map(quote).join(', ')}` : null,
        removed.length ? `removed ${removed.map(quote).join(', ')}` : null,
      ].filter(Boolean);
      return {
        verb: 'updated the labels of',
        target,
        detail: parts.length ? `(${parts.join('; ')})` : null,
      };
    }
    default:
      return { verb: `updated the ${fieldLabel(field)} of`, target };
  }
}

function describeProjectUpdate(meta) {
  const target = meta.projectName ?? 'a project';
  const changes = Array.isArray(meta.changes) ? meta.changes : [];
  const statusChange = changes.find((change) => change.field === 'status');
  const nameChange = changes.find((change) => change.field === 'name');

  if (statusChange) {
    const archived = statusChange.to === 'archived';
    return {
      verb: archived ? 'archived the project' : 'restored the project',
      target,
      detail: nameChange?.from ? `(renamed from ${quote(nameChange.from)})` : null,
      icon: archived ? Archive : ArchiveRestore,
      tone: archived ? TONES.amber : TONES.green,
    };
  }
  if (nameChange?.from) return { verb: `renamed the project ${quote(nameChange.from)} to`, target };

  const fields = uniqueList(
    (Array.isArray(meta.fields) ? meta.fields : [])
      .filter((field) => field !== 'status')
      .map(fieldLabel),
  );
  return {
    verb: fields.length ? `updated the ${joinList(fields)} of` : 'updated the project',
    target,
  };
}

function describeAssignment(meta, activity) {
  const target = taskTarget(meta);
  const actorId = activity?.actor?._id;
  const nameOf = (person) =>
    person?._id && actorId && person._id === actorId ? 'themselves' : (person?.name ?? 'someone');

  if (!meta.to) {
    return {
      verb: meta.from ? `unassigned ${nameOf(meta.from)} from` : 'unassigned',
      target,
      icon: UserMinus,
      tone: TONES.gray,
    };
  }
  if (meta.from) {
    return {
      verb: 'reassigned',
      target,
      detail: `from ${nameOf(meta.from)} to ${nameOf(meta.to)}`,
    };
  }
  return { verb: 'assigned', target, detail: `to ${nameOf(meta.to)}` };
}

/**
 * Per-action sentence builders. Each returns `{ verb, target, detail?, quote?, icon?, tone? }`
 * and the shared `targetType` decides what the target links to.
 */
const DESCRIBERS = {
  'team.created': {
    icon: Users,
    tone: TONES.brand,
    targetType: 'team',
    build: (meta) => ({ verb: 'created the team', target: meta.teamName ?? null }),
  },
  'team.updated': {
    icon: Pencil,
    tone: TONES.gray,
    targetType: 'team',
    build: (meta) => {
      const fields = uniqueList((Array.isArray(meta.fields) ? meta.fields : []).map(fieldLabel));
      return {
        verb: fields.length ? `updated the ${joinList(fields)} of` : 'updated the team',
        target: meta.teamName ?? null,
      };
    },
  },
  'team.member_added': {
    icon: UserPlus,
    tone: TONES.green,
    targetType: 'member',
    build: (meta) => ({
      verb: 'added',
      target: meta.memberName ?? 'a new member',
      detail:
        [
          meta.teamName ? `to ${meta.teamName}` : null,
          meta.role ? `as ${withArticle(roleLabel(meta.role).toLowerCase())}` : null,
        ]
          .filter(Boolean)
          .join(' ') || null,
    }),
  },
  'team.member_removed': {
    icon: UserMinus,
    tone: TONES.red,
    targetType: 'member',
    build: (meta) =>
      meta.left
        ? { verb: 'left the team', target: meta.teamName ?? null, icon: LogOut, targetType: 'team' }
        : {
            verb: 'removed',
            target: meta.memberName ?? 'a member',
            detail: meta.teamName ? `from ${meta.teamName}` : null,
          },
  },
  'team.member_role_changed': {
    icon: ShieldCheck,
    tone: TONES.purple,
    targetType: 'member',
    build: (meta) => ({
      verb: 'changed the role of',
      target: meta.memberName ?? 'a member',
      detail: fromTo(meta.from, meta.to, roleLabel),
    }),
  },
  'project.created': {
    icon: FolderPlus,
    tone: TONES.brand,
    targetType: 'project',
    build: (meta) => ({ verb: 'created the project', target: meta.projectName ?? null }),
  },
  'project.updated': {
    icon: Pencil,
    tone: TONES.gray,
    targetType: 'project',
    build: describeProjectUpdate,
  },
  'project.deleted': {
    icon: Trash2,
    tone: TONES.red,
    targetType: 'deleted',
    build: (meta) => ({ verb: 'deleted the project', target: meta.projectName ?? null }),
  },
  'task.created': {
    icon: Plus,
    tone: TONES.brand,
    targetType: 'task',
    build: (meta) => ({
      verb: 'created',
      target: taskTarget(meta),
      detail: meta.status && meta.status !== 'todo' ? `in ${statusLabel(meta.status)}` : null,
    }),
  },
  'task.updated': {
    icon: Pencil,
    tone: TONES.gray,
    targetType: 'task',
    build: describeTaskUpdate,
  },
  'task.status_changed': {
    icon: ArrowRightLeft,
    tone: TONES.blue,
    targetType: 'task',
    build: (meta) =>
      meta.to === 'completed'
        ? { verb: 'completed', target: taskTarget(meta), icon: CheckCircle2, tone: TONES.green }
        : {
            verb: 'moved',
            target: taskTarget(meta),
            detail: fromTo(meta.from, meta.to, statusLabel),
          },
  },
  'task.assigned': {
    icon: UserCheck,
    tone: TONES.purple,
    targetType: 'task',
    build: describeAssignment,
  },
  'task.deleted': {
    icon: Trash2,
    tone: TONES.red,
    targetType: 'deleted',
    build: (meta) => ({ verb: 'deleted', target: taskTarget(meta) }),
  },
  'comment.added': {
    icon: MessageSquare,
    tone: TONES.sky,
    targetType: 'task',
    build: (meta) => ({
      verb: 'commented on',
      target: taskTarget(meta),
      quote: meta.excerpt || null,
    }),
  },
};

/**
 * Graceful fallback for actions this client does not know yet: "task.archived" ->
 * "archived WEB-3 Auth API", "sprint.started" -> "started a sprint".
 */
function describeUnknown(meta, action) {
  const [entity = '', act = ''] = String(action ?? '').split('.');
  const verb = humanize(act || entity).toLowerCase() || 'made an update';
  const hasTask = Boolean(meta.taskKey || meta.taskTitle);
  const targets = {
    task: hasTask ? { target: taskTarget(meta), targetType: 'task' } : null,
    comment: hasTask ? { target: taskTarget(meta), targetType: 'task' } : null,
    project: meta.projectName ? { target: meta.projectName, targetType: 'project' } : null,
    team: meta.teamName ? { target: meta.teamName, targetType: 'team' } : null,
  };
  const own = act ? targets[entity] : null;
  if (own) return { verb, ...own };
  if (act && entity) {
    return { verb: `${verb} ${withArticle(humanize(entity).toLowerCase())}`, target: null };
  }
  return { verb, target: null };
}

/**
 * Turns an activity log entry into a readable sentence:
 * `<actor> {verb} <target> {detail}` e.g. "Priya moved WEB-12 Fix login from To Do to In Progress".
 *
 * @returns {{
 *   verb: string, target: string | null, detail: string | null, quote: string | null,
 *   icon: import('react').ComponentType, tone: string,
 *   targetType: 'task' | 'project' | 'team' | 'member' | 'deleted' | null
 * }}
 */
export function describeActivity(activity) {
  const meta = activity?.meta ?? {};
  const action = activity?.action ?? '';
  const describer = DESCRIBERS[action];

  const base = describer
    ? { icon: describer.icon, tone: describer.tone, targetType: describer.targetType }
    : { icon: Activity, tone: TONES.gray, targetType: null };
  const sentence = describer ? describer.build(meta, activity) : describeUnknown(meta, action);

  return {
    verb: '',
    target: null,
    detail: null,
    quote: null,
    ...base,
    ...sentence,
  };
}
