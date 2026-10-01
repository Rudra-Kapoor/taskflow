import { BellRing, MousePointer2, Radio, SquareKanban } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const FEATURES = [
  {
    icon: SquareKanban,
    title: 'Drag-and-drop Kanban boards',
    text: 'Move work from To Do to Done and reorder priorities in a flick.',
  },
  {
    icon: Radio,
    title: 'Live updates & presence',
    text: 'See teammates’ changes the instant they happen, and who’s on the board.',
  },
  {
    icon: BellRing,
    title: 'Activity logs & notifications',
    text: 'A full history of every change, plus alerts when work lands on your plate.',
  },
];

const STATS = [
  { value: 'Real-time', label: 'Socket.IO sync' },
  { value: '3 roles', label: 'Owner · Admin · Member' },
  { value: 'Light & dark', label: 'Themes built in' },
];

/** Split-screen layout for the sign-in / sign-up pages. */
export function AuthLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen bg-surface">
      <BrandPanel />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgb(99_102_241/0.12),transparent_70%)] lg:hidden"
        />
        <header className="relative flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
          <Logo to="/login" className="lg:invisible" />
          <ThemeToggle />
        </header>

        <main className="relative flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-sm animate-slide-up">{children}</div>
        </main>

        <footer className="relative px-4 pb-6 text-center text-xs text-fg-subtle sm:px-8">
          © {year} TaskFlow · Plan, track and ship together
        </footer>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden w-1/2 shrink-0 overflow-hidden bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 text-white lg:sticky lg:top-0 lg:flex lg:h-screen xl:w-[54%]">
      <div
        aria-hidden="true"
        className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-fuchsia-400/30 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col justify-between gap-10 p-10 xl:p-14">
        <Logo variant="inverted" />

        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight xl:text-[2.75rem]">
            Plan, track and ship — together, in real time.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
            TaskFlow brings your team’s boards, tasks and conversations into one fast, collaborative
            workspace.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/25">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Decorative extras only show when the viewport is tall enough to fit them. */}
          <KanbanPreview className="mt-10 [@media(max-height:780px)]:hidden" />
        </div>

        <ul className="grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6 [@media(max-height:1000px)]:hidden">
          {STATS.map((stat) => (
            <li key={stat.value}>
              <p className="text-lg font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-0.5 text-xs text-white/65">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

const MOCK_COLUMNS = [
  {
    title: 'To Do',
    dot: 'bg-slate-200',
    cards: [
      { width: 'w-4/5', tag: 'bg-sky-300', priority: 'bg-amber-300', avatar: '#f97316' },
      { width: 'w-3/5', tag: 'bg-emerald-300', priority: 'bg-slate-300', avatar: '#22c55e' },
    ],
  },
  {
    title: 'In Progress',
    dot: 'bg-blue-300',
    cards: [
      {
        width: 'w-2/3',
        tag: 'bg-rose-300',
        priority: 'bg-rose-400',
        avatar: '#ec4899',
        active: true,
      },
      { width: 'w-1/2', tag: 'bg-violet-300', priority: 'bg-orange-300', avatar: '#06b6d4' },
    ],
  },
  {
    title: 'Done',
    dot: 'bg-emerald-300',
    cards: [{ width: 'w-3/4', tag: 'bg-amber-300', priority: 'bg-slate-300', avatar: '#6366f1' }],
  },
];

/** Decorative mini board (pure markup) illustrating the product. */
function KanbanPreview({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl shadow-indigo-950/30 backdrop-blur-md',
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-white/70" />
          <span className="h-2 w-28 rounded-full bg-white/60" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex -space-x-1.5">
            {['#f97316', '#22c55e', '#ec4899'].map((color) => (
              <span
                key={color}
                className="h-5 w-5 rounded-full ring-2 ring-white/40"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2 py-0.5 text-2xs font-semibold text-emerald-50 ring-1 ring-inset ring-emerald-200/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MOCK_COLUMNS.map((column) => (
          <div key={column.title} className="rounded-xl bg-white/[0.08] p-2.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-white/85">
              <span className={cn('h-1.5 w-1.5 rounded-full', column.dot)} />
              {column.title}
              <span className="ml-auto text-white/50">{column.cards.length}</span>
            </div>
            <div className="space-y-2">
              {column.cards.map((card, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative rounded-lg border border-white/20 bg-white/10 p-2.5 backdrop-blur',
                    card.active &&
                      'animate-float bg-white/20 shadow-lg shadow-indigo-950/30 ring-1 ring-white/40',
                  )}
                >
                  <span className={cn('block h-1.5 w-7 rounded-full', card.tag)} />
                  <span className={cn('mt-2 block h-1.5 rounded-full bg-white/70', card.width)} />
                  <span className="mt-1.5 block h-1.5 w-2/5 rounded-full bg-white/35" />
                  <div className="mt-3 flex items-center justify-between">
                    <span className={cn('h-2 w-2 rounded-sm', card.priority)} />
                    <span
                      className="h-4 w-4 rounded-full ring-1 ring-white/50"
                      style={{ backgroundColor: card.avatar }}
                    />
                  </div>
                  {card.active && (
                    <span className="absolute -bottom-5 -right-3 flex items-center gap-1">
                      <MousePointer2 className="h-4 w-4 fill-pink-500 text-white" />
                      <span className="rounded-full bg-pink-600 px-1.5 py-0.5 text-2xs font-semibold leading-none text-white shadow">
                        Priya
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
