import mongoose from 'mongoose';
import { projectSnapshot, taskSnapshot } from '../services/activity.service.js';
import { notificationMessages, taskRef } from '../services/notification.service.js';
import { ACTIVITY, NOTIFICATION, POSITION_GAP, TASK_STATUSES } from '../utils/constants.js';
import { DAY, getDayRange } from '../utils/dates.js';
import { formatTaskKey, truncate } from '../utils/format.js';
import { DEMO_TZ_OFFSET, NOTIFICATIONS, PROJECTS, TEAMS, USERS } from './data.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const EXCERPT_LENGTH = 120; // same as comment.service.js
const EDIT_DELAY = 12 * MINUTE; // edited comments were fixed shortly after posting
const READ_DELAY = 2 * HOUR; // read notifications were opened a while after they arrived
const REMINDER_DELAY = 5 * MINUTE; // the reminder job runs every few minutes

/** Task fields that `updates` in data.js can replay. */
const TASK_UPDATE_FIELDS = ['assignee', 'priority', 'dueDate'];
/** Project fields that can be edited without being listed in `changes` (see project.service). */
const PROJECT_EDIT_FIELDS = ['description', 'color'];

const userRef = (user) => (user ? { _id: user._id, name: user.name } : null);

/** `started` / `completed` accept days ago or `{ at, by }`. */
const toStep = (value) => (typeof value === 'number' ? { at: value } : (value ?? null));

const assertChronological = (items = [], label) => {
  items.forEach((item, index) => {
    if (index > 0 && item.at >= items[index - 1].at) {
      throw new Error(`${label} must be listed oldest first`);
    }
  });
};

/** Cards are appended to a column when they enter it, so each column follows that order. */
function assignPositions(tasks) {
  for (const status of TASK_STATUSES) {
    tasks
      .filter(({ doc }) => doc.status === status)
      .sort((a, b) => a.columnEnteredAt - b.columnEnteredAt)
      .forEach(({ doc }, index) => {
        doc.position = (index + 1) * POSITION_GAP;
      });
  }
}

/** Same wording as the notifications sent by the API. */
function notificationMessage(type, { actor, team, project, task, to }) {
  switch (type) {
    case NOTIFICATION.TASK_ASSIGNED:
      return notificationMessages.taskAssigned(actor.name, taskRef(task, project));
    case NOTIFICATION.TASK_STATUS_CHANGED:
      return notificationMessages.taskStatusChanged(actor.name, taskRef(task, project), to);
    case NOTIFICATION.TASK_COMMENTED:
      return notificationMessages.taskCommented(actor.name, taskRef(task, project));
    case NOTIFICATION.TASK_DUE_SOON:
      return notificationMessages.taskDueSoon(taskRef(task, project));
    default:
      return notificationMessages.teamMemberAdded(actor.name, team.name);
  }
}

/**
 * Turns the relative content of data.js into plain documents for every collection, anchored to
 * `now`. It replays the history the way the API records it (activity entries, notifications,
 * counters, timestamps) and throws on inconsistent data, e.g. a task assigned to someone outside
 * the team or a comment written before its task existed. Never touches the database.
 */
class DemoDataBuilder {
  constructor({ now, tzOffset }) {
    this.now = now.getTime();
    this.startOfToday = getDayRange(tzOffset, now).start.getTime();
    this.users = new Map();
    this.teams = new Map();
    this.tasks = new Map();
    this.activityTimes = new Set();
    this.docs = {
      users: [],
      teams: [],
      projects: [],
      tasks: [],
      comments: [],
      activities: [],
      notifications: [],
    };
  }

  build() {
    USERS.forEach((spec) => this.addUser(spec));
    TEAMS.forEach((spec) => this.addTeam(spec));
    PROJECTS.forEach((spec) => this.addProject(spec));
    NOTIFICATIONS.forEach((spec) => this.addNotification(spec));
    return this.docs;
  }

  /** The moment `days` before now. Seeded history never reaches into the future. */
  ago(days) {
    if (!(days > 0)) throw new Error(`Event times must be in the past, got ${days} days ago`);
    return new Date(this.now - days * DAY);
  }

  /** End of the local day `offset` days from today, the way the web client sends due dates. */
  endOfDay(offset) {
    return offset == null ? null : new Date(this.startOfToday + (offset + 1) * DAY - 1);
  }

  /** ObjectIds embed a creation time: keep it in line with the document's `createdAt`. */
  objectId(date) {
    return new mongoose.Types.ObjectId(Math.floor(date.getTime() / SECOND));
  }

  user(key) {
    const user = this.users.get(key);
    if (!user) throw new Error(`Unknown user "${key}" in seed data`);
    return user;
  }

  /** Resolves a user and checks that they had joined `team` by `date`. */
  member(team, key, date) {
    const user = this.user(key);
    const membership = team.members.find((member) => member.user.equals(user._id));
    if (!membership || membership.joinedAt > date) {
      throw new Error(`${user.name} is not in ${team.name} on ${date.toISOString()}`);
    }
    return user;
  }

  log(action, { actor, at, team, project = null, task = null, meta }) {
    // Distinct timestamps keep the replayed history in a strict order (feeds sort by createdAt).
    let time = at.getTime();
    while (this.activityTimes.has(time)) time += 1;
    this.activityTimes.add(time);

    const createdAt = new Date(time);
    // Like the API, every project-scoped entry marks its project as recently active.
    if (project && createdAt > project.lastActivityAt) project.lastActivityAt = createdAt;
    this.docs.activities.push({
      _id: this.objectId(createdAt),
      actor: actor._id,
      action,
      team: team._id,
      project: project?._id ?? null,
      task: task?._id ?? null,
      meta,
      createdAt,
    });
  }

  addUser({ key, name, email, title, avatarColor, joined }) {
    const createdAt = this.ago(joined);
    const user = {
      _id: this.objectId(createdAt),
      name,
      email,
      title,
      avatarColor,
      createdAt,
      updatedAt: createdAt,
    };
    this.users.set(key, user);
    this.docs.users.push(user);
  }

  addTeam({ key, name, description, owner: ownerKey, created, members }) {
    const createdAt = this.ago(created);
    const owner = this.user(ownerKey);
    const team = {
      _id: this.objectId(createdAt),
      name,
      description,
      owner: owner._id,
      members: [{ user: owner._id, role: 'owner', joinedAt: createdAt }],
      createdAt,
      updatedAt: createdAt,
    };
    const additions = [];
    this.log(ACTIVITY.TEAM_CREATED, {
      actor: owner,
      at: createdAt,
      team,
      meta: { teamName: name },
    });

    for (const { user: userKey, role, addedBy, at } of members) {
      const joinedAt = this.ago(at);
      const actor = this.member(team, addedBy, joinedAt);
      const user = this.user(userKey);
      team.members.push({ user: user._id, role, joinedAt });
      if (joinedAt > team.updatedAt) team.updatedAt = joinedAt;
      additions.push({ user, actor, at: joinedAt });
      this.log(ACTIVITY.MEMBER_ADDED, {
        actor,
        at: joinedAt,
        team,
        meta: { teamName: name, memberId: user._id, memberName: user.name, role },
      });
    }

    this.teams.set(key, { doc: team, additions });
    this.docs.teams.push(team);
  }

  addProject(spec) {
    const { name, key, tasks, archived } = spec;
    const team = this.teams.get(spec.team)?.doc;
    if (!team) throw new Error(`Unknown team "${spec.team}" for project ${key}`);
    const createdAt = this.ago(spec.created);
    const creator = this.member(team, spec.createdBy, createdAt);
    const project = {
      _id: this.objectId(createdAt),
      name,
      key,
      description: spec.description,
      color: spec.color,
      status: archived ? 'archived' : 'active',
      team: team._id,
      createdBy: creator._id,
      taskSeq: tasks.length, // tasks are numbered 1..n (checked in addTask)
      lastActivityAt: createdAt, // moved forward by every activity logged for it (see log)
      createdAt,
      updatedAt: createdAt, // numbering tasks does not touch it, only project edits do
    };
    const recordEdit = (by, at, meta) => {
      this.log(ACTIVITY.PROJECT_UPDATED, {
        actor: this.member(team, by, at),
        at,
        team,
        project,
        meta: { ...projectSnapshot(project), ...meta },
      });
      if (at > project.updatedAt) project.updatedAt = at;
    };

    this.log(ACTIVITY.PROJECT_CREATED, {
      actor: creator,
      at: createdAt,
      team,
      project,
      meta: projectSnapshot(project),
    });

    const builtTasks = tasks.map((task, index) =>
      this.addTask(project, team, task, tasks[index - 1]),
    );
    assignPositions(builtTasks);

    assertChronological(spec.updates, `${key} updates`);
    for (const { by, at, fields } of spec.updates ?? []) {
      if (!fields.every((field) => PROJECT_EDIT_FIELDS.includes(field))) {
        throw new Error(`${key}: project updates may only touch ${PROJECT_EDIT_FIELDS.join(', ')}`);
      }
      recordEdit(by, this.ago(at), { fields, changes: [] });
    }

    if (archived) {
      const archivedAt = this.ago(archived.at);
      if (builtTasks.some((task) => task.lastEventAt >= archivedAt)) {
        throw new Error(`${name} has task activity after it was archived (archived = read-only)`);
      }
      recordEdit(archived.by, archivedAt, {
        fields: ['status'],
        changes: [{ field: 'status', from: 'active', to: 'archived' }],
      });
    }

    this.docs.projects.push(project);
  }

  addTask(project, team, spec, previous) {
    const taskKey = formatTaskKey(project.key, spec.number);
    if (spec.number !== (previous?.number ?? 0) + 1) {
      throw new Error(`${taskKey}: tasks must be numbered 1, 2, 3... within a project`);
    }
    const createdAt = this.ago(spec.created);
    if (createdAt <= project.createdAt || (previous && spec.created >= previous.created)) {
      throw new Error(`${taskKey}: tasks must be listed in creation order, after their project`);
    }

    const creator = this.member(team, spec.createdBy, createdAt);
    const task = {
      _id: this.objectId(createdAt),
      project: project._id,
      number: spec.number,
      title: spec.title,
      description: spec.description,
      status: 'todo',
      priority: spec.priority,
      assignee: null,
      createdBy: creator._id,
      dueDate: this.endOfDay(spec.due),
      labels: spec.labels ?? [],
      position: 0, // set per column once every task of the project is known
      commentCount: 0,
      completedAt: null,
      dueReminderSentAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const context = {
      key: taskKey,
      doc: task,
      team,
      project,
      creator,
      assignee: null,
      assignments: [],
      statusChanges: [],
      comments: [],
      columnEnteredAt: createdAt,
      lastEventAt: createdAt,
    };
    const meta = taskSnapshot(task, project);
    const logEvent = (action, actor, at, details) => {
      this.log(action, { actor, at, team, project, task, meta: { ...meta, ...details } });
      if (at > context.lastEventAt) context.lastEventAt = at;
    };
    /** A change of the task document itself, which also moves its `updatedAt`. */
    const recordChange = (action, actor, at, details) => {
      logEvent(action, actor, at, details);
      if (at > task.updatedAt) task.updatedAt = at;
    };
    const setAssignee = (actor, at, assigneeKey) => {
      context.assignee = assigneeKey ? this.member(team, assigneeKey, at) : null;
      context.assignments.push({ actor, at, to: context.assignee });
    };

    // Like the API: creating a task logs `task.created` and notifies its assignee (if any).
    logEvent(ACTIVITY.TASK_CREATED, creator, createdAt, { status: 'todo' });

    // Replay edits, starting from the values the task was created with.
    const updates = spec.updates ?? [];
    assertChronological(updates, `${taskKey} updates`);
    const current = {
      assignee: spec.assignee ?? null,
      priority: spec.priority,
      dueDate: spec.due ?? null,
    };
    const values = { ...current };
    for (const field of TASK_UPDATE_FIELDS) {
      const first = updates.find((update) => update.field === field);
      if (first) values[field] = first.from;
    }
    if (values.assignee) setAssignee(creator, createdAt, values.assignee);

    for (const { by, at: daysAgo, field, from, to } of updates) {
      const at = this.ago(daysAgo);
      if (!TASK_UPDATE_FIELDS.includes(field) || values[field] !== from || at <= createdAt) {
        throw new Error(`${taskKey}: invalid ${field} update from ${from} to ${to}`);
      }
      const actor = this.member(team, by, at);
      if (field === 'assignee') {
        const previousAssignee = context.assignee;
        setAssignee(actor, at, to);
        recordChange(ACTIVITY.TASK_ASSIGNED, actor, at, {
          from: userRef(previousAssignee),
          to: userRef(context.assignee),
        });
      } else {
        // Same logged values as task.service: due dates as ISO strings.
        const logged = (value) =>
          field === 'dueDate' ? (this.endOfDay(value)?.toISOString() ?? null) : value;
        recordChange(ACTIVITY.TASK_UPDATED, actor, at, {
          changes: [{ field, from: logged(from), to: logged(to) }],
        });
      }
      values[field] = to;
    }
    if (TASK_UPDATE_FIELDS.some((field) => values[field] !== current[field])) {
      throw new Error(`${taskKey}: updates must end at the task's current values`);
    }

    // Status changes: todo -> in_progress -> completed, by the assignee unless `by` is given.
    const move = (step, from, to) => {
      const at = this.ago(step.at);
      if (at <= context.columnEnteredAt) throw new Error(`${taskKey}: ${to} happens too early`);
      const actor = this.member(team, step.by ?? spec.assignee ?? spec.createdBy, at);
      recordChange(ACTIVITY.TASK_STATUS_CHANGED, actor, at, { from, to });
      context.statusChanges.push({ actor, at, to });
      context.columnEnteredAt = at;
      task.status = to;
      return at;
    };
    const started = toStep(spec.started);
    const completed = toStep(spec.completed);
    if (completed && !started) throw new Error(`${taskKey}: completed tasks must be started first`);
    if (started) move(started, 'todo', 'in_progress');
    if (completed) task.completedAt = move(completed, 'in_progress', 'completed');

    // Comments only bump the task's counter, not its `updatedAt` (see comment.service).
    assertChronological(spec.comments, `${taskKey} comments`);
    for (const { by, at: daysAgo, body, edited } of spec.comments ?? []) {
      const at = this.ago(daysAgo);
      if (at <= createdAt) throw new Error(`${taskKey}: comment written before the task existed`);
      const author = this.member(team, by, at);
      const editedAt = edited ? new Date(Math.min(at.getTime() + EDIT_DELAY, this.now)) : null;
      const comment = {
        _id: this.objectId(at),
        task: task._id,
        project: project._id,
        author: author._id,
        body,
        editedAt,
        createdAt: at,
        updatedAt: editedAt ?? at,
      };
      logEvent(ACTIVITY.COMMENT_ADDED, author, at, {
        commentId: comment._id,
        excerpt: truncate(body, EXCERPT_LENGTH),
      });
      context.comments.push({ actor: author, at });
      this.docs.comments.push(comment);
    }

    task.assignee = context.assignee?._id ?? null;
    task.commentCount = context.comments.length;
    task.dueReminderSentAt = this.reminderTime(context);

    this.tasks.set(taskKey, context);
    this.docs.tasks.push(task);
    return context;
  }

  /**
   * The due-date job reminds the assignee once, as soon as an open task is due within 24 hours.
   * Tasks whose window already opened are marked as reminded so the live job won't repeat it.
   */
  reminderTime({ doc, assignee, assignments }) {
    if (!doc.dueDate || !assignee || doc.status === 'completed') return null;
    const windowOpensAt = doc.dueDate.getTime() - DAY;
    if (windowOpensAt > this.now) return null;
    const assignedAt = assignments.at(-1).at.getTime();
    const sentAt = Math.max(windowOpensAt, assignedAt) + REMINDER_DELAY;
    return new Date(Math.min(sentAt, this.now - MINUTE));
  }

  /** Finds the event behind a notification: who did it, when, and where. */
  findNotificationEvent({ recipient, type, task: taskKey, team: teamKey, actor: actorKey, to }) {
    if (type === NOTIFICATION.TEAM_MEMBER_ADDED) {
      const { doc: team, additions = [] } = this.teams.get(teamKey) ?? {};
      const addition = additions.find(({ user }) => user === recipient);
      return addition ? { actor: addition.actor, at: addition.at, team } : null;
    }

    const context = this.tasks.get(taskKey);
    if (!context) throw new Error(`Unknown task "${taskKey}" in notifications`);
    const { doc: task, team, project, creator, assignee } = context;
    // Status and comment notifications go to the task's creator and assignee.
    const isFollower = [creator, assignee].includes(recipient);
    const author = actorKey && this.user(actorKey);

    let event;
    switch (type) {
      case NOTIFICATION.TASK_ASSIGNED:
        event = context.assignments.findLast((assignment) => assignment.to === recipient);
        break;
      case NOTIFICATION.TASK_STATUS_CHANGED:
        event = isFollower && context.statusChanges.find((change) => change.to === to);
        break;
      case NOTIFICATION.TASK_COMMENTED:
        event = isFollower && context.comments.findLast((comment) => comment.actor === author);
        break;
      case NOTIFICATION.TASK_DUE_SOON:
        // Sent by the reminder job rather than by a teammate.
        event = assignee === recipient && { actor: null, at: task.dueReminderSentAt };
        break;
      default:
        event = null;
    }
    return event?.at ? { actor: event.actor, at: event.at, team, project, task, to } : null;
  }

  addNotification(spec) {
    const recipient = this.user(spec.recipient);
    const event = this.findNotificationEvent({ ...spec, recipient });
    if (!event || event.actor === recipient) {
      throw new Error(`No ${spec.type} event for ${spec.recipient} on ${spec.task ?? spec.team}`);
    }

    const { actor, at: createdAt, team, project = null, task = null } = event;
    const read = Boolean(spec.read);
    const readAt = read ? new Date(Math.min(createdAt.getTime() + READ_DELAY, this.now)) : null;
    this.docs.notifications.push({
      _id: this.objectId(createdAt),
      recipient: recipient._id,
      actor: actor?._id ?? null,
      type: spec.type,
      message: notificationMessage(spec.type, event),
      team: team._id,
      project: project?._id ?? null,
      task: task?._id ?? null,
      read,
      readAt,
      createdAt,
      updatedAt: readAt ?? createdAt,
    });
  }
}

/**
 * Builds every demo document (users without passwords) relative to `now`. Due dates fall at the
 * end of a local day in `tzOffset` minutes (Date#getTimezoneOffset convention, IST = -330).
 */
export function buildDemoData({ now = new Date(), tzOffset = DEMO_TZ_OFFSET } = {}) {
  return new DemoDataBuilder({ now, tzOffset }).build();
}
