/**
 * Demo content for TaskFlow: a small product team dogfooding TaskFlow to build TaskFlow.
 *
 * Everything is relative to the moment the seed runs (see build.js), so the demo always looks
 * current:
 * - Event times (`joined`, `created`, `at`, `started`, `completed`) are days before now.
 *   Fractions are fine: 0.25 means six hours ago.
 * - `due` is a calendar-day offset from today in DEMO_TZ_OFFSET (0 = today, -2 = two days ago,
 *   3 = in three days). It resolves to the end of that local day, like the web client sends it.
 * - People are referenced by their `key`, teams by their `key` and tasks by their task key.
 * - Tasks are listed in creation order and numbered from 1 within each project. `started` and
 *   `completed` take a time (the assignee moved the card) or `{ at, by }`.
 * - A task's `updates` replay later edits of `assignee`, `priority` or `dueDate` and must end at
 *   its current value. Without an assignee update, the creator assigned the task on creation.
 * - A project's `updates` are description/colour edits; `archived: { by, at }` archives it.
 */

/** The demo team works in IST (UTC+05:30). Same convention as Date#getTimezoneOffset(). */
export const DEMO_TZ_OFFSET = -330;

export const USERS = [
  {
    key: 'demo',
    name: 'Demo User',
    email: 'demo@example.com',
    title: 'Product Manager',
    avatarColor: '#8b5cf6',
    joined: 23,
  },
  {
    key: 'aarav',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    title: 'Frontend Developer',
    avatarColor: '#3b82f6',
    joined: 22.4,
  },
  {
    key: 'priya',
    name: 'Priya Patel',
    email: 'priya@example.com',
    title: 'Backend Developer',
    avatarColor: '#f43f5e',
    joined: 22.6,
  },
  {
    key: 'rahul',
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    title: 'UI/UX Designer',
    avatarColor: '#eab308',
    joined: 22.2,
  },
  {
    key: 'sneha',
    name: 'Sneha Iyer',
    email: 'sneha@example.com',
    title: 'QA Engineer',
    avatarColor: '#22c55e',
    joined: 22,
  },
  {
    key: 'karan',
    name: 'Karan Mehta',
    email: 'karan@example.com',
    title: 'DevOps Engineer',
    avatarColor: '#06b6d4',
    joined: 21.5,
  },
];

export const TEAMS = [
  {
    key: 'engineering',
    name: 'Product Engineering',
    description:
      'Designs, builds and ships TaskFlow across web, mobile and the platform API. ' +
      'Planning on Mondays, demos on Fridays.',
    owner: 'demo',
    created: 21,
    members: [
      { user: 'priya', role: 'admin', addedBy: 'demo', at: 20.95 },
      { user: 'aarav', role: 'member', addedBy: 'demo', at: 20.94 },
      { user: 'rahul', role: 'member', addedBy: 'demo', at: 20.93 },
      { user: 'sneha', role: 'member', addedBy: 'demo', at: 20.92 },
      { user: 'karan', role: 'member', addedBy: 'priya', at: 20.1 },
    ],
  },
  {
    key: 'growth',
    name: 'Growth & Marketing',
    description: 'Brand, website and campaigns that bring new teams to TaskFlow.',
    owner: 'rahul',
    created: 12,
    members: [
      { user: 'sneha', role: 'admin', addedBy: 'rahul', at: 11.95 },
      { user: 'demo', role: 'member', addedBy: 'rahul', at: 11.9 },
    ],
  },
];

export const PROJECTS = [
  {
    team: 'engineering',
    name: 'TaskFlow Web App',
    key: 'WEB',
    color: '#6366f1',
    description:
      'The React web client: Kanban boards, task details, dashboards and real-time ' +
      'collaboration. Goal: public beta by the end of the quarter.',
    createdBy: 'demo',
    created: 20.8,
    updates: [{ by: 'demo', at: 2.9, fields: ['description'] }],
    tasks: [
      {
        number: 1,
        title: 'Scaffold the React app with Vite, Tailwind and routing',
        description:
          'Set up the client workspace with Vite, Tailwind CSS, React Router and TanStack ' +
          'Query, plus a CI job that runs lint and build on every pull request.',
        priority: 'high',
        labels: ['frontend', 'infra'],
        createdBy: 'aarav',
        assignee: 'aarav',
        due: -18,
        created: 20.6,
        started: 20.5,
        completed: 18.4,
      },
      {
        number: 2,
        title: 'Build the design system primitives',
        description:
          'Buttons, inputs, selects, modals, badges and avatars with light and dark variants. ' +
          'Every component must be fully keyboard accessible.',
        priority: 'high',
        labels: ['design', 'frontend'],
        createdBy: 'demo',
        assignee: 'rahul',
        due: -13,
        created: 20.4,
        started: 19.2,
        completed: 13.6,
        comments: [
          {
            by: 'aarav',
            at: 16.1,
            body: 'Could we get the modal and dropdown specs first? The board depends on both.',
          },
          {
            by: 'rahul',
            at: 15.8,
            body: 'Both are in Figma under Components > Overlays. Toasts and tooltips are next.',
          },
        ],
      },
      {
        number: 3,
        title: 'Implement login and registration pages',
        description:
          'Email and password forms with inline validation, server errors mapped onto the ' +
          'fields and a redirect back to the page the user originally asked for.',
        priority: 'high',
        labels: ['frontend', 'auth'],
        createdBy: 'demo',
        assignee: 'aarav',
        due: -12,
        created: 19.9,
        started: 17.8,
        completed: { at: 12.4, by: 'sneha' },
        comments: [
          {
            by: 'priya',
            at: 17.2,
            body:
              'Auth endpoints are live on staging. Validation errors come back as field/message ' +
              'pairs, so you can map them straight onto the inputs.',
          },
          {
            by: 'aarav',
            at: 13.1,
            body:
              'PR is up: login, register and the redirect after login. Sneha, could you run ' +
              'through the edge cases?',
          },
          {
            by: 'sneha',
            at: 12.6,
            body:
              'Tested on Chrome, Firefox and Safari, including wrong passwords and expired ' +
              'sessions. All good from QA - I will move it to Completed.',
          },
        ],
      },
      {
        number: 4,
        title: 'Kanban board with drag-and-drop between columns',
        description:
          'To Do, In Progress and Completed columns with reordering inside a column and moves ' +
          'across columns. Updates are optimistic and roll back if the API rejects the move.',
        priority: 'urgent',
        labels: ['frontend'],
        createdBy: 'demo',
        assignee: 'aarav',
        due: -2,
        created: 18.3,
        started: 12.2,
        completed: 2.6,
        updates: [{ by: 'demo', at: 9.4, field: 'priority', from: 'high', to: 'urgent' }],
        comments: [
          {
            by: 'aarav',
            at: 8.7,
            body: 'Going with dnd-kit: keyboard dragging and touch support work out of the box.',
          },
          {
            by: 'demo',
            at: 8.5,
            body:
              'Sounds good. Please make sure the card order survives a page refresh - that was ' +
              'the top complaint about the old dashboard.',
          },
          {
            by: 'aarav',
            at: 3.2,
            edited: true,
            body:
              'PR is up. Positions use fractional indexing, so a move only updates the card that ' +
              'moved.',
          },
          {
            by: 'sneha',
            at: 2.8,
            body: 'Verified on desktop and iPad, including keyboard dragging. Ship it!',
          },
        ],
      },
      {
        number: 5,
        title: 'Task detail modal with comments',
        description:
          'Open a task from the board or a shared link, edit every field inline and show the ' +
          'comment thread with the activity history underneath.',
        priority: 'high',
        labels: ['frontend'],
        createdBy: 'demo',
        assignee: 'aarav',
        due: 2,
        created: 15.2,
        started: 2.4,
        comments: [
          {
            by: 'rahul',
            at: 2.1,
            body:
              'Final mockups are in Figma. Comments sit under the description and the activity ' +
              'log is collapsed by default.',
          },
          {
            by: 'aarav',
            at: 0.8,
            body: 'Inline editing works for every field. Working on the comment composer now.',
          },
        ],
      },
      {
        number: 6,
        title: 'Show who is viewing a board in real time',
        description:
          'Use Socket.IO presence to show the avatars of teammates who have the same board ' +
          'open. Avatars disappear a few seconds after someone closes the tab.',
        priority: 'medium',
        labels: ['frontend', 'realtime'],
        createdBy: 'demo',
        assignee: 'priya',
        due: 4,
        created: 14.6,
        started: 3.5,
        updates: [{ by: 'demo', at: 6.1, field: 'assignee', from: 'aarav', to: 'priya' }],
        comments: [
          {
            by: 'demo',
            at: 6.08,
            body: "Moving this to Priya: it's mostly socket work and Aarav is busy with the board.",
          },
        ],
      },
      {
        number: 7,
        title: 'Write acceptance criteria for the dashboard widgets',
        description:
          'Define what each dashboard card counts (assigned, overdue, due today, completed ' +
          'this week), the empty states and how the viewer timezone decides what is today.',
        priority: 'high',
        labels: ['docs'],
        createdBy: 'demo',
        assignee: 'demo',
        due: 0,
        created: 9.3,
        started: 1.6,
        comments: [
          {
            by: 'aarav',
            at: 1.2,
            body: 'Quick question: is "completed this week" the last 7 days or since Monday?',
          },
          {
            by: 'demo',
            at: 1.1,
            body: 'The last 7 days - easier to explain and it matches the API. Adding it now.',
          },
        ],
      },
      {
        number: 8,
        title: 'Dark mode contrast audit',
        description:
          'Check every screen in dark mode against WCAG AA contrast ratios and fix the tokens ' +
          'that fall short, especially muted text and priority badges.',
        priority: 'low',
        labels: ['design', 'frontend'],
        createdBy: 'rahul',
        assignee: 'rahul',
        due: 6,
        created: 8.4,
      },
      {
        number: 9,
        title: 'Keyboard shortcuts for board navigation',
        description:
          'Arrow keys move between cards, Enter opens a task, C creates one and / focuses ' +
          'search. Pressing ? shows a cheat sheet.',
        priority: 'low',
        labels: ['frontend'],
        createdBy: 'aarav',
        created: 7.8,
        updates: [{ by: 'aarav', at: 5, field: 'assignee', from: 'aarav', to: null }],
      },
      {
        number: 10,
        title: 'Review empty states and onboarding copy',
        description:
          'Go through every empty state (no projects, no tasks, no notifications) and make the ' +
          'copy friendly and actionable. Pair with Rahul on the illustrations.',
        priority: 'medium',
        labels: ['design', 'docs'],
        createdBy: 'rahul',
        assignee: 'demo',
        due: 3,
        created: 5.2,
      },
      {
        number: 11,
        title: 'Fix: card jumps back after dropping it in Safari',
        description:
          'On Safari 17 a card dropped into another column sometimes snaps back for a moment ' +
          'before settling. The optimistic update and the socket echo seem to race.',
        priority: 'urgent',
        labels: ['bug', 'frontend', 'realtime'],
        createdBy: 'sneha',
        assignee: 'aarav',
        due: -1,
        created: 2.3,
        updates: [{ by: 'demo', at: 2.1, field: 'assignee', from: null, to: 'aarav' }],
        comments: [
          {
            by: 'sneha',
            at: 2.25,
            body:
              'Steps: drag a card from To Do to In Progress and drop it over the column header. ' +
              'Happens about one in five times on Safari 17.',
          },
          {
            by: 'aarav',
            at: 0.4,
            body:
              'I can reproduce it: the socket echo arrives before the mutation settles. Picking ' +
              'this up right after the task modal PR.',
          },
        ],
      },
      {
        number: 12,
        title: 'Usability test the board with five pilot teams',
        description:
          'Run 30-minute sessions with five teams from the beta list and summarise the top ' +
          'issues, focusing on creating tasks and moving them across columns.',
        priority: 'medium',
        labels: ['research'],
        createdBy: 'demo',
        assignee: 'demo',
        due: 9,
        created: 0.55,
      },
    ],
  },
  {
    team: 'engineering',
    name: 'Mobile App',
    key: 'MOB',
    color: '#ec4899',
    description:
      'React Native app for iOS and Android so teams can triage tasks, comment and get ' +
      'notified on the go.',
    createdBy: 'demo',
    created: 20.5,
    tasks: [
      {
        number: 1,
        title: 'Set up the React Native project with Expo',
        description:
          'Expo SDK, navigation and the shared API client. The app must run on both ' +
          'simulators and on a physical device.',
        priority: 'high',
        labels: ['mobile', 'infra'],
        createdBy: 'demo',
        assignee: 'aarav',
        due: -16,
        created: 20.3,
        started: 19.4,
        completed: 16.2,
      },
      {
        number: 2,
        title: 'Automate iOS and Android builds with EAS',
        description:
          'EAS Build profiles for preview and production, signing credentials kept out of the ' +
          'repo and preview builds shipped to internal testers on every merge to main.',
        priority: 'medium',
        labels: ['infra'],
        createdBy: 'priya',
        assignee: 'karan',
        due: -11,
        created: 19.8,
        started: 17.1,
        completed: 11.3,
      },
      {
        number: 3,
        title: 'Biometric unlock on app launch',
        description:
          'Offer Face ID or fingerprint unlock after the first login and fall back to the ' +
          'password screen when biometrics are unavailable.',
        priority: 'medium',
        labels: ['mobile', 'auth'],
        createdBy: 'demo',
        assignee: 'aarav',
        due: -4,
        created: 16.5,
        started: 9.8,
        completed: 4.6,
      },
      {
        number: 4,
        title: 'Push notifications for assignments and comments',
        description:
          'Send a push notification when a task is assigned to you or someone comments on ' +
          'your task. Tapping the notification opens the task.',
        priority: 'high',
        labels: ['mobile', 'backend'],
        createdBy: 'demo',
        assignee: 'priya',
        due: 3,
        created: 13.4,
        started: 6.3,
        comments: [
          {
            by: 'priya',
            at: 6.2,
            body:
              'Starting with Expo push tokens stored per device. We can switch to FCM/APNs ' +
              'directly later if we need more control.',
          },
          {
            by: 'sneha',
            at: 0.25,
            body:
              'Tested on a Pixel 7: notifications arrive, but tapping one opens the home screen ' +
              'instead of the task.',
          },
        ],
      },
      {
        number: 5,
        title: 'Define the MVP scope for the mobile beta',
        description:
          'Agree on the must-have screens for the first beta, what can wait until after ' +
          'launch and the success metrics we will track.',
        priority: 'high',
        labels: ['docs', 'mobile'],
        createdBy: 'demo',
        assignee: 'demo',
        due: -1,
        created: 12.6,
        started: 7.4,
        completed: 1.4,
        comments: [
          {
            by: 'aarav',
            at: 1.6,
            body: 'Is tablet support in or out for the beta?',
          },
          {
            by: 'demo',
            at: 1.5,
            body: 'Out for the beta - phones only. The tablet layout has its own task (MOB-10).',
          },
        ],
      },
      {
        number: 6,
        title: 'My Tasks screen with filters',
        description:
          'List the tasks assigned to me across all projects with status and due date ' +
          'filters, pull-to-refresh and infinite scrolling.',
        priority: 'medium',
        labels: ['mobile', 'frontend'],
        createdBy: 'aarav',
        assignee: 'aarav',
        due: 5,
        created: 9.1,
        started: 1.9,
      },
      {
        number: 7,
        title: 'Define offline mode requirements',
        description:
          'Decide what has to work without a connection (browsing boards, editing tasks, ' +
          'commenting) and how conflicts are resolved once the device is back online.',
        priority: 'urgent',
        labels: ['docs', 'mobile'],
        createdBy: 'priya',
        assignee: 'demo',
        due: -2,
        created: 8.6,
        updates: [{ by: 'priya', at: 3.4, field: 'priority', from: 'high', to: 'urgent' }],
        comments: [
          {
            by: 'priya',
            at: 3.38,
            body:
              'Any update here? We need the conflict rules before designing the sync API, so ' +
              'I bumped the priority.',
          },
        ],
      },
      {
        number: 8,
        title: 'Prepare App Store and Play Store listings',
        description:
          'Phone and tablet screenshots, short and long descriptions, keywords and the ' +
          'privacy questionnaires for both stores.',
        priority: 'medium',
        labels: ['docs', 'marketing'],
        createdBy: 'demo',
        assignee: 'demo',
        due: 5,
        created: 6.9,
      },
      {
        number: 9,
        title: 'Beta test plan for 20 pilot users',
        description:
          'Write the test scenarios, recruit pilot users from the waitlist and set up a ' +
          'feedback form. Crashes are tracked in Sentry during the beta.',
        priority: 'medium',
        labels: ['qa', 'mobile'],
        createdBy: 'sneha',
        assignee: 'sneha',
        due: 7,
        created: 5.6,
        started: 1,
      },
      {
        number: 10,
        title: 'Tablet layout for the board',
        description:
          'Use the extra width on tablets to show columns side by side and open task details ' +
          'in a side panel instead of a full-screen sheet.',
        priority: 'low',
        labels: ['design', 'mobile'],
        createdBy: 'rahul',
        assignee: 'rahul',
        due: 12,
        created: 4.2,
      },
      {
        number: 11,
        title: 'Queue task updates while offline',
        description:
          'Persist edits made without a connection and replay them in order once the device ' +
          'is back online. Depends on the requirements in MOB-7.',
        priority: 'medium',
        labels: ['mobile', 'backend'],
        createdBy: 'priya',
        created: 3.9,
      },
      {
        number: 12,
        title: 'Fix: crash when opening a task from a notification on Android 14',
        description:
          'The app crashes when it is cold-started from a notification on Android 14. The ' +
          'stack trace points at navigation running before the container is ready.',
        priority: 'urgent',
        labels: ['bug', 'mobile'],
        createdBy: 'sneha',
        due: 1,
        created: 1.7,
      },
    ],
  },
  {
    team: 'engineering',
    name: 'Platform API',
    key: 'API',
    color: '#14b8a6',
    description:
      'Node.js REST and Socket.IO backend behind every TaskFlow client: auth, permissions, ' +
      'tasks, notifications and the activity log.',
    createdBy: 'priya',
    created: 20.7,
    tasks: [
      {
        number: 1,
        title: 'JWT authentication and password hashing',
        description:
          'Register, login and current-user endpoints with bcrypt password hashing and signed ' +
          'JWTs that expire after seven days.',
        priority: 'urgent',
        labels: ['backend', 'auth'],
        createdBy: 'priya',
        assignee: 'priya',
        due: -18,
        created: 20.65,
        started: 20.55,
        completed: 18.1,
      },
      {
        number: 2,
        title: 'Team roles and permission middleware',
        description:
          'Owner, admin and member roles enforced by one middleware for teams, projects and ' +
          'tasks. Non-members get a 403 and missing resources a 404.',
        priority: 'high',
        labels: ['backend', 'auth'],
        createdBy: 'priya',
        assignee: 'priya',
        due: -14,
        created: 20.45,
        started: 18,
        completed: 14.2,
        comments: [
          {
            by: 'demo',
            at: 17.5,
            body: 'Reminder: admins can add members, but only the owner can change roles.',
          },
          {
            by: 'priya',
            at: 17.3,
            body: "Got it - I'll encode that in the permission matrix and test every role.",
          },
        ],
      },
      {
        number: 3,
        title: 'Provision a MongoDB Atlas cluster with daily backups',
        description:
          'Dedicated cluster in the Mumbai region with IP allow-listing, daily snapshots kept ' +
          'for seven days and alerts on connection spikes.',
        priority: 'high',
        labels: ['infra'],
        createdBy: 'priya',
        assignee: 'karan',
        due: -16,
        created: 19.95,
        started: 19,
        completed: 16.8,
      },
      {
        number: 4,
        title: 'Containerize the API and deploy to staging',
        description:
          'Multi-stage Dockerfile, a health check endpoint and a GitHub Actions workflow that ' +
          'deploys every merge to the staging environment.',
        priority: 'high',
        labels: ['infra'],
        createdBy: 'priya',
        assignee: 'karan',
        due: -1,
        created: 15.1,
        started: 7.2,
        updates: [{ by: 'priya', at: 13.2, field: 'assignee', from: null, to: 'karan' }],
        completed: 1.9,
        comments: [
          {
            by: 'karan',
            at: 2,
            body:
              'Staging is live. Deploys take about three minutes and the health check is wired ' +
              'into the load balancer.',
          },
        ],
      },
      {
        number: 5,
        title: 'Write the PRD for the notifications service',
        description:
          'Document which events notify whom, the delivery channels (in-app, push, email ' +
          'digest) and how people can mute noisy projects.',
        priority: 'medium',
        labels: ['docs'],
        createdBy: 'demo',
        assignee: 'demo',
        due: -3,
        created: 10.4,
        started: 8.2,
        completed: 3.3,
        comments: [
          {
            by: 'priya',
            at: 3.1,
            body:
              'Read through it - the recipient rules are clear. I will create the backend tasks ' +
              'from section 4.',
          },
        ],
      },
      {
        number: 6,
        title: 'Socket.IO events for task and comment updates',
        description:
          'Broadcast task and comment changes to everyone viewing a project and deliver ' +
          'notification events only to the affected user.',
        priority: 'high',
        labels: ['backend', 'realtime'],
        createdBy: 'priya',
        assignee: 'priya',
        due: 1,
        created: 9.7,
        started: 5.1,
      },
      {
        number: 7,
        title: 'Rate limiting and brute-force protection for auth',
        description:
          'Limit login and registration to 30 requests per 15 minutes per IP with a clear 429 ' +
          'message, and log repeated failures so credential stuffing is easy to spot.',
        priority: 'urgent',
        labels: ['backend', 'security', 'auth'],
        createdBy: 'priya',
        assignee: 'karan',
        due: -1,
        created: 8.9,
        started: 4.4,
        updates: [{ by: 'priya', at: 4, field: 'priority', from: 'high', to: 'urgent' }],
        comments: [
          {
            by: 'karan',
            at: 1.4,
            body:
              'Rate limits are live on login and register. Still need to send repeated failures ' +
              'to our alerting.',
          },
        ],
      },
      {
        number: 8,
        title: 'Load test board endpoints with 500 concurrent users',
        description:
          'Use k6 to simulate 500 people opening boards and moving cards. Target a p95 below ' +
          '300 ms for loading a board.',
        priority: 'medium',
        labels: ['performance', 'qa'],
        createdBy: 'priya',
        assignee: 'sneha',
        due: 0,
        created: 7.4,
        started: 0.9,
        updates: [{ by: 'priya', at: 6.9, field: 'assignee', from: null, to: 'sneha' }],
        comments: [
          {
            by: 'sneha',
            at: 0.6,
            body:
              'First run: p95 is 410 ms on the tasks endpoint. Looks like we are missing an ' +
              'index on project + status.',
          },
          {
            by: 'priya',
            at: 0.5,
            body: "Good catch - the compound index is in my next PR. Can you rerun once it's out?",
          },
        ],
      },
      {
        number: 9,
        title: 'Decide the retention policy for activity logs',
        description:
          'How long do we keep activity history and notifications? Check customer contracts ' +
          'and propose a default, with an export option before anything is deleted.',
        priority: 'medium',
        labels: ['docs'],
        createdBy: 'karan',
        assignee: 'demo',
        due: -1,
        created: 6.4,
      },
      {
        number: 10,
        title: 'Due-date reminder background job',
        description:
          'Every few minutes, find open tasks due within the next 24 hours and notify the ' +
          'assignee exactly once. It must be safe to run on several instances.',
        priority: 'high',
        labels: ['backend'],
        createdBy: 'demo',
        assignee: 'priya',
        due: 4,
        created: 3.2,
      },
      {
        number: 11,
        title: 'Publish the public API changelog for v1.2',
        description:
          'Summarise new endpoints, breaking changes and deprecations for integrators and ' +
          'link the changelog from the developer docs.',
        priority: 'low',
        labels: ['docs'],
        createdBy: 'demo',
        assignee: 'demo',
        due: 2,
        created: 2.7,
        updates: [{ by: 'demo', at: 1, field: 'dueDate', from: 1, to: 2 }],
      },
      {
        number: 12,
        title: 'Cursor pagination for activity feeds',
        description:
          'Switch the activity endpoints to cursor pagination (before + limit) so busy teams ' +
          'never load thousands of entries at once.',
        priority: 'medium',
        labels: ['backend', 'performance'],
        createdBy: 'priya',
        due: 8,
        created: 1.1,
      },
    ],
  },
  {
    team: 'growth',
    name: 'Website Relaunch',
    key: 'SITE',
    color: '#f97316',
    description:
      'Relaunch of the marketing website with the new brand, faster pages and a self-serve ' +
      'signup funnel.',
    createdBy: 'rahul',
    created: 11.8,
    tasks: [
      {
        number: 1,
        title: 'Moodboard and visual direction for the new brand',
        description:
          'Collect references for typography, colour and illustration style, then present ' +
          'two directions to the team and pick one.',
        priority: 'high',
        labels: ['design'],
        createdBy: 'rahul',
        assignee: 'rahul',
        due: -8,
        created: 11.7,
        started: 11.5,
        completed: 8.3,
        comments: [
          {
            by: 'demo',
            at: 8.9,
            body: "Direction B feels much closer to the product. Let's go with it.",
          },
          {
            by: 'rahul',
            at: 8.6,
            body: 'Agreed. Finalising the colour palette and type scale on top of B.',
          },
        ],
      },
      {
        number: 2,
        title: 'Competitor messaging teardown',
        description:
          'Review the homepages of five competitors and summarise how they position ' +
          'themselves, anchor their pricing and prove their claims.',
        priority: 'medium',
        labels: ['marketing', 'research'],
        createdBy: 'rahul',
        assignee: 'demo',
        due: -5,
        created: 11.4,
        started: 10.2,
        completed: 5.4,
      },
      {
        number: 3,
        title: 'Homepage wireframes',
        description:
          'Low-fidelity wireframes for the hero, feature tour, social proof and pricing ' +
          'teaser, for both desktop and mobile.',
        priority: 'high',
        labels: ['design'],
        createdBy: 'rahul',
        assignee: 'rahul',
        due: -4,
        created: 10.8,
        started: 8.1,
        completed: 4.1,
        comments: [
          {
            by: 'sneha',
            at: 4.5,
            body:
              'Can we add a short FAQ above the footer? Support answers the same five questions ' +
              'every week.',
          },
          {
            by: 'rahul',
            at: 4.3,
            body: 'Good idea - added it to the wireframe.',
          },
        ],
      },
      {
        number: 4,
        title: 'Set up analytics and conversion tracking',
        description:
          'Add privacy-friendly analytics, define the signup funnel events and build a weekly ' +
          'conversion report.',
        priority: 'medium',
        labels: ['analytics'],
        createdBy: 'sneha',
        assignee: 'sneha',
        due: -2,
        created: 9.5,
        started: 5.8,
        updates: [{ by: 'sneha', at: 4.6, field: 'dueDate', from: -4, to: -2 }],
      },
      {
        number: 5,
        title: 'Design the hero and feature sections',
        description:
          'High-fidelity designs for the hero, the three feature blocks and the product ' +
          'screenshots, in both light and dark themes.',
        priority: 'high',
        labels: ['design'],
        createdBy: 'rahul',
        assignee: 'rahul',
        due: 2,
        created: 6.2,
        started: 3.9,
        comments: [
          {
            by: 'demo',
            at: 1.45,
            body:
              'Love the hero. Can we try a version where the screenshot shows the board instead ' +
              'of the dashboard?',
          },
          {
            by: 'rahul',
            at: 1.3,
            body: "Sure - I'll mock up both so we can compare them side by side.",
          },
        ],
      },
      {
        number: 6,
        title: 'Write the pricing page copy',
        description:
          'Plan names, one-line pitches, the feature comparison table and the FAQ for the ' +
          'Free, Team and Business plans.',
        priority: 'high',
        labels: ['content', 'marketing'],
        createdBy: 'rahul',
        assignee: 'demo',
        due: 1,
        created: 5.7,
        started: 2.2,
        comments: [
          {
            by: 'sneha',
            at: 0.15,
            body:
              'Small thing: the Team plan says "unlimited projects" but the comparison table ' +
              'caps it at 50.',
          },
        ],
      },
      {
        number: 7,
        title: 'Plan the launch announcement email and blog post',
        description:
          'Draft the announcement email for existing users and the launch post for the blog, ' +
          'timed with the website going live.',
        priority: 'medium',
        labels: ['marketing', 'content'],
        createdBy: 'demo',
        assignee: 'demo',
        due: 6,
        created: 3.6,
      },
      {
        number: 8,
        title: 'Cross-browser QA on the staging site',
        description:
          'Test every page on Chrome, Safari, Firefox and Edge, plus iOS and Android. Cover ' +
          'the forms, the signup flow and dark mode.',
        priority: 'medium',
        labels: ['qa'],
        createdBy: 'sneha',
        assignee: 'sneha',
        due: 8,
        created: 2.9,
      },
      {
        number: 9,
        title: 'Optimize images and Core Web Vitals',
        description:
          'Serve AVIF and WebP images, lazy-load media below the fold and get LCP under 2.5 ' +
          'seconds on a mid-range phone.',
        priority: 'low',
        labels: ['performance'],
        createdBy: 'rahul',
        due: 12,
        created: 2.4,
      },
      {
        number: 10,
        title: 'Collect logo approvals from pilot customers',
        description:
          'Ask the ten pilot customers for permission to show their logo on the homepage and ' +
          'keep track of who said yes.',
        priority: 'low',
        createdBy: 'sneha',
        created: 0.7,
      },
    ],
  },
  {
    // Finished and archived: demonstrates read-only archived projects.
    team: 'engineering',
    name: 'Legacy Dashboard',
    key: 'LEG',
    color: '#64748b',
    description:
      'Sunset of the v1 admin dashboard: customer data export, URL redirects and the ' +
      'announcement. Archived after the old dashboard was switched off.',
    createdBy: 'demo',
    created: 20.6,
    archived: { by: 'demo', at: 7.6 },
    tasks: [
      {
        number: 1,
        title: 'Export historical reports for customers',
        description:
          'Give every customer a CSV export of their v1 reports before the old dashboard is ' +
          'switched off.',
        priority: 'high',
        labels: ['backend'],
        createdBy: 'demo',
        assignee: 'priya',
        due: -12,
        created: 20.52,
        started: 18.9,
        completed: 12.8,
      },
      {
        number: 2,
        title: 'Redirect legacy dashboard URLs to the new web app',
        description:
          'Permanently redirect every old dashboard route to the matching page in the new app ' +
          'and keep the redirects for at least six months.',
        priority: 'medium',
        labels: ['infra'],
        createdBy: 'demo',
        assignee: 'karan',
        due: -9,
        created: 19.7,
        started: 11.6,
        completed: 9.4,
      },
      {
        number: 3,
        title: 'Announce the dashboard sunset to customers',
        description:
          'In-app banner, email and help-center article explaining the timeline and how to ' +
          'export data before the switch-off.',
        priority: 'medium',
        labels: ['docs'],
        createdBy: 'demo',
        assignee: 'demo',
        due: -10,
        created: 19.5,
        started: 15,
        completed: 10.2,
      },
    ],
  },
];

/**
 * Notifications are resolved against the history above: the actor and the time come from the
 * matching event (assignment, status change, comment, member added or due-date reminder).
 * Unread unless `read: true`.
 */
export const NOTIFICATIONS = [
  // Demo User: five unread, the rest already read.
  { recipient: 'demo', type: 'task_commented', task: 'SITE-6', actor: 'sneha' },
  { recipient: 'demo', type: 'task_commented', task: 'MOB-4', actor: 'sneha' },
  { recipient: 'demo', type: 'task_commented', task: 'WEB-5', actor: 'aarav' },
  { recipient: 'demo', type: 'task_due_soon', task: 'WEB-7' },
  { recipient: 'demo', type: 'task_commented', task: 'WEB-7', actor: 'aarav' },
  { recipient: 'demo', type: 'task_status_changed', task: 'WEB-5', to: 'in_progress', read: true },
  { recipient: 'demo', type: 'task_status_changed', task: 'WEB-4', to: 'completed', read: true },
  { recipient: 'demo', type: 'task_commented', task: 'MOB-7', actor: 'priya', read: true },
  { recipient: 'demo', type: 'task_assigned', task: 'WEB-10', read: true },
  { recipient: 'demo', type: 'task_assigned', task: 'API-9', read: true },
  { recipient: 'demo', type: 'task_assigned', task: 'MOB-7', read: true },
  { recipient: 'demo', type: 'team_member_added', team: 'growth', read: true },

  // Teammates
  { recipient: 'aarav', type: 'task_assigned', task: 'WEB-11' },
  { recipient: 'sneha', type: 'task_commented', task: 'WEB-11', actor: 'aarav' },
  { recipient: 'sneha', type: 'task_due_soon', task: 'API-8' },
  { recipient: 'sneha', type: 'team_member_added', team: 'growth', read: true },
  { recipient: 'priya', type: 'task_commented', task: 'MOB-4', actor: 'sneha' },
  { recipient: 'priya', type: 'task_assigned', task: 'API-10', read: true },
  { recipient: 'rahul', type: 'task_commented', task: 'SITE-6', actor: 'sneha' },
  { recipient: 'rahul', type: 'task_commented', task: 'SITE-5', actor: 'demo', read: true },
  { recipient: 'karan', type: 'task_assigned', task: 'API-7', read: true },
  { recipient: 'karan', type: 'task_due_soon', task: 'API-7', read: true },
];
