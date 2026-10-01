import { Link } from 'react-router-dom';
import { MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const FEATURES = [
  { title: 'Kanban boards', text: 'Drag work from To Do to Done, in the order that matters.' },
  { title: 'Live presence', text: 'Moves, edits and comments land for everyone at once.' },
  { title: 'Activity log', text: 'Every change on record, and a ping when work is yours.' },
];

const META = 'font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-fg-subtle';

/**
 * Editorial split layout for the sign-in / sign-up pages. Large screens get a paper showcase
 * (serif headline, numbered features, a miniature board) beside a focused form column; smaller
 * screens get the form with a compact header. On large screens both columns are exactly one
 * viewport tall (the form area scrolls on its own if it must), so the header and footer
 * hairlines always line up across the page.
 */
export function AuthLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen bg-canvas lg:h-screen lg:overflow-hidden">
      <Showcase />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col lg:h-full lg:min-h-0 lg:border-l lg:border-line">
        {/* On large screens the wordmark lives in the showcase and this row floats over the form
            column, so short laptop screens keep the whole form in view. */}
        <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10 lg:h-20 lg:px-10">
          <Logo to="/login" className="lg:invisible" />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col px-5 pb-14 pt-4 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:py-20 [@media(min-height:761px)_and_(max-height:860px)]:lg:py-10 [@media(max-height:760px)]:lg:py-5">
          <div className="mx-auto my-auto w-full max-w-[380px] animate-slide-up">{children}</div>
        </main>

        <footer
          className={cn(
            META,
            'flex h-14 shrink-0 items-center justify-between gap-4 border-t border-line px-5 sm:px-8 lg:px-10',
          )}
        >
          <span>© {year} TaskFlow</span>
          <span className="lg:hidden">Real-time · Socket.IO</span>
        </footer>
      </div>
    </div>
  );
}

/** Mono eyebrow, serif title and one quiet line: the heading shared by the auth forms. */
export function AuthHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8 [@media(max-height:760px)]:mb-5">
      <p className={cn(META, 'text-fg-muted')}>{eyebrow}</p>
      <h1 className="mt-4 font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-fg">
        {title}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>
    </div>
  );
}

/** Hairline-separated "Already have an account? Sign in" line under an auth form. */
export function AuthSwitch({ prompt, to, children }) {
  return (
    <p className="mt-7 border-t border-line pt-5 text-sm text-fg-muted [@media(max-height:760px)]:mt-5 [@media(max-height:760px)]:pt-4">
      {prompt}{' '}
      <Link
        to={to}
        className={cn(
          'focus-ring rounded-sm font-medium underline underline-offset-[3px] transition-colors',
          'text-brand-700 decoration-brand-700/30 hover:text-brand-800 hover:decoration-brand-800',
          'dark:text-brand-400 dark:decoration-brand-400/40 dark:hover:text-brand-300',
          'dark:hover:decoration-brand-300',
        )}
      >
        {children}
      </Link>
    </p>
  );
}

/** Left column on large screens: the product story set like a page from a printed brief. */
function Showcase() {
  return (
    <aside
      aria-label="About TaskFlow"
      className="hidden h-full w-[56%] shrink-0 flex-col lg:flex xl:w-[58%]"
    >
      <header className="flex h-20 shrink-0 items-center px-10 xl:px-16">
        <Logo to="/login" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-10 xl:px-16">
        <div className="w-full max-w-[44rem] animate-fade-in 2xl:max-w-[48rem]">
          <h2 className="font-display text-[length:clamp(3rem,min(8.4vh,5.6vw),5.25rem)] leading-[0.94] tracking-[-0.02em] text-fg 2xl:text-[length:clamp(3rem,8.4vh,5.75rem)]">
            Plan the work.
            <br />
            Ship it <em className="italic">together.</em>
          </h2>

          <p className="mt-[clamp(1rem,2.8vh,1.5rem)] max-w-[30rem] text-[15px] leading-relaxed text-fg-muted">
            A calm, real-time workspace for small teams. Boards, tasks and conversation in one
            place, so everyone knows what is next.
          </p>

          <ol className="mt-[clamp(1.25rem,3.5vh,2.25rem)] max-w-[40rem] border-b border-line xl:[@media(max-height:819px)]:hidden">
            {FEATURES.map((feature, index) => (
              <li
                key={feature.title}
                className="grid grid-cols-[2.5rem_1fr] items-baseline gap-y-0.5 border-t border-line py-3 xl:grid-cols-[2.75rem_8.5rem_1fr] xl:py-2.5"
              >
                <span aria-hidden="true" className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium text-fg">{feature.title}</span>
                <span className="col-start-2 text-sm text-fg-muted xl:col-start-3">
                  {feature.text}
                </span>
              </li>
            ))}
          </ol>

          <BoardPreview className="mt-[clamp(1.25rem,3.5vh,2.25rem)] hidden xl:block xl:[@media(max-height:719px)]:hidden" />
        </div>
      </div>

      <footer
        className={cn(
          META,
          'flex h-14 shrink-0 items-center justify-between gap-4 border-t border-line px-10 xl:px-16',
        )}
      >
        <span>Real-time · Socket.IO · MongoDB</span>
        <span className="hidden xl:inline">Boards · Tasks · Teams</span>
      </footer>
    </aside>
  );
}

const PREVIEW_LANES = [
  {
    status: 'todo',
    title: 'To Do',
    cards: [
      { id: 'WEB-14', title: 'Audit colour contrast', label: 'design', priority: 2, who: 'SI' },
      { id: 'WEB-15', title: 'Draft release notes', label: 'docs', priority: 1, who: 'KM' },
    ],
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    cards: [
      {
        id: 'WEB-12',
        title: 'Onboarding checklist',
        label: 'frontend',
        priority: 3,
        who: 'PP',
        dragging: true,
      },
      { id: 'WEB-11', title: 'Cache board queries', label: 'api', priority: 2, who: 'AS' },
    ],
  },
  {
    status: 'completed',
    title: 'Done',
    dropSlot: true,
    cards: [{ id: 'WEB-9', title: 'Socket reconnect', label: 'realtime', priority: 1, who: 'RV' }],
  },
];

const PRIORITY_BARS = [
  { x: 2, y: 9.5, height: 4 },
  { x: 6.5, y: 6.5, height: 7 },
  { x: 11, y: 3.5, height: 10 },
];

/**
 * Decorative miniature of the real board (same anatomy as TaskCard: mono key, signal-bar priority,
 * outlined label, assignee initials), drawn in neutral ink with one vermilion detail: Priya's
 * live cursor dragging WEB-12 towards Done.
 */
function BoardPreview({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('select-none overflow-hidden rounded-xl border border-line bg-surface', className)}
    >
      <div className="flex h-10 items-center gap-2 border-b border-line px-3.5">
        <span className="rounded-[4px] border border-line px-1.5 font-mono text-[11px] leading-[18px] text-fg-muted">
          WEB
        </span>
        <span className="text-[13px] font-medium text-fg">Website relaunch</span>
        <span className="text-[13px] text-fg-subtle">/ Board</span>
        <span className="ml-auto flex -space-x-[3px]">
          {['SI', 'AS', 'PP'].map((initials) => (
            <Initials key={initials} className="h-[22px] w-[22px] ring-2 ring-surface">
              {initials}
            </Initials>
          ))}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-2.5">
        {PREVIEW_LANES.map((lane) => (
          <div key={lane.status} className="min-w-0 rounded-lg bg-surface-muted p-1.5 pb-2">
            <div className="flex h-7 items-center gap-2 px-1.5">
              <StatusGlyph status={lane.status} />
              <span className="truncate font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-fg">
                {lane.title}
              </span>
              <span className="ml-auto font-mono text-[11px] leading-none text-fg-subtle">
                {lane.cards.length}
              </span>
            </div>
            <div className="mt-1 space-y-1.5">
              {lane.dropSlot && (
                <div className="h-[4.125rem] rounded-md border border-dashed border-line-strong" />
              )}
              {lane.cards.map((card) => (
                <PreviewCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ card }) {
  return (
    <div
      className={cn(
        'relative rounded-md border bg-surface px-2.5 pb-2 pt-2 dark:bg-surface-hover',
        card.dragging
          ? 'z-10 rotate-[0.8deg] border-fg/80 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_28px_-6px_rgb(0_0_0/0.22)] dark:border-fg/60 dark:shadow-[0_12px_28px_-6px_rgb(0_0_0/0.6)]'
          : 'border-line',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] leading-none text-fg-muted">{card.id}</span>
        <PriorityBars level={card.priority} />
      </div>
      <p className="mt-1.5 truncate text-[13px] font-medium leading-snug text-fg">{card.title}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate rounded-[4px] border border-line px-1.5 text-[11px] leading-[18px] text-fg-muted">
          {card.label}
        </span>
        <Initials className={card.dragging && 'border-fg bg-fg text-canvas'}>{card.who}</Initials>
      </div>

      {card.dragging && (
        <span className="absolute -bottom-6 right-6 flex items-start">
          <MousePointer2 className="h-[18px] w-[18px] fill-brand-500 text-surface" strokeWidth={1.5} />
          <span className="ml-0.5 mt-3 rounded-[4px] bg-brand-600 px-1.5 py-[3px] text-[11px] font-medium leading-none text-white">
            Priya
          </span>
        </span>
      )}
    </div>
  );
}

function Initials({ className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-strong',
        'bg-surface-muted text-[10px] font-semibold leading-none text-fg-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Neutral status glyphs: hollow ring (to do), half-filled ring (in progress), check (done). */
function StatusGlyph({ status }) {
  if (status === 'completed') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none">
        <circle cx="8" cy="8" r="7" className="fill-fg" />
        <path
          d="M5 8.25 7.1 10.3 11 6.1"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-surface-muted"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none">
      <circle
        cx="8"
        cy="8"
        r="6.25"
        strokeWidth="1.5"
        className={status === 'todo' ? 'stroke-fg-subtle' : 'stroke-fg'}
      />
      {status === 'in_progress' && <path d="M8 4.25a3.75 3.75 0 0 1 0 7.5z" className="fill-fg" />}
    </svg>
  );
}

/** Same signal bars as the board's priority glyph, in ink. */
function PriorityBars({ level }) {
  return (
    <svg viewBox="0 0 16 16" className="ml-auto h-3.5 w-3.5 shrink-0" fill="none">
      {PRIORITY_BARS.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={bar.y}
          width="3"
          height={bar.height}
          rx="0.9"
          className={index < level ? 'fill-fg-muted' : 'fill-line-strong'}
        />
      ))}
    </svg>
  );
}
