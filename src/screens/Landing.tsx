import { Link } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Check,
  Circle,
  CircleCheck,
  Heart,
  List,
  Users,
  Wallet,
} from 'lucide-react';
import bouquet from '../assets/wedding/bouquet.jpg';
import couple from '../assets/wedding/couple.jpg';
import reception from '../assets/wedding/reception.jpg';
import { BrandMark, LanguageSwitch } from '../components/PublicLayout';
import { ThemeIconButton } from '../components/ShellControls';
import { cx } from '../components/ui';
import { useT } from '../i18n';
import { formatMoney } from '../lib/format';
import { paths, signUpPath } from '../lib/paths';
import { useSession } from '../lib/session';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.12em]';
const WRAP = 'mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-10';
const HEADING = 'font-serif text-[clamp(1.875rem,3vw,2.5rem)] font-medium leading-[1.18] text-balance';
const PRIMARY = `inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-accent-solid px-6 py-3 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 ${FOCUS_RING}`;
const TEXT_LINK = `inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-accent hover:underline ${FOCUS_RING}`;
const TOOL_ICONS = [CalendarCheck, Wallet, Users, List];
const SECTION_IDS = ['planning-tools', 'how-it-works', 'questions'];
const SHORTCUT_IDS = ['checklist-tool', 'budget-tool', 'guests-tool', 'shared-planning'];

/** Public wedding-planning homepage; preview data is illustrative. */
export function Landing() {
  const t = useT();
  const l = t.landing;
  const hasData = useSession((s) => s.status === 'signedIn');
  const ctaPath = hasData ? paths.workspaces : signUpPath;
  const ctaLabel = hasData ? l.ctaOpen : l.cta;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className={cx(WRAP, 'flex items-center justify-between gap-2 border-b border-line-subtle py-4 lg:py-6')}>
        <Link
          to={paths.landing}
          aria-label={`${t.appName}, ${l.nav}`}
          className={cx('flex min-w-0 items-center gap-2.5 rounded-lg', FOCUS_RING)}
        >
          <BrandMark />
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-semibold leading-tight lowercase md:text-xl">
              {t.appName}
            </span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-wider text-muted md:block">
              {l.tagline}
            </span>
          </span>
        </Link>
        <nav aria-label={l.nav} className="hidden items-center gap-6 xl:flex">
          {l.sectionNav.map((label, i) => (
            <a
              key={label}
              href={`#${SECTION_IDS[i]}`}
              className={cx(
                'inline-flex min-h-11 items-center rounded-sm text-sm text-muted hover:text-ink',
                FOCUS_RING,
              )}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 md:gap-3">
          <LanguageSwitch />
          <span className="hidden sm:block">
            <ThemeIconButton />
          </span>
          <Link
            to={paths.login}
            className={cx(
              'inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium hover:underline',
              FOCUS_RING,
            )}
          >
            {l.signIn}
          </Link>
          <span className="hidden md:block">
            <Link to={ctaPath} className={PRIMARY}>
              {hasData ? l.ctaOpen : l.start}
            </Link>
          </span>
        </div>
      </header>

      <main id="main">
        <section
          aria-labelledby="landing-title"
          className={cx(WRAP, 'grid items-center gap-9 py-10 lg:grid-cols-2 lg:gap-12 lg:py-14')}
        >
          <div>
            <p className={cx(LABEL, 'flex items-center gap-2 text-accent')}>
              <Heart size={16} aria-hidden="true" />
              {l.eyebrow}
            </p>
            <h1
              id="landing-title"
              className="mt-6 font-serif text-[clamp(2.25rem,4.5vw,3.875rem)] font-medium leading-[1.1] tracking-[-0.025em]"
            >
              <span className="block">{l.headline1} </span>
              <span className="block">{l.headline2}</span>
            </h1>
            <p className="mt-6 max-w-[550px] text-base leading-relaxed text-muted lg:text-lg">{l.lead}</p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
              <Link to={ctaPath} className={PRIMARY}>
                {ctaLabel}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#planning-tools" className={cx(TEXT_LINK, 'justify-center sm:justify-start')}>
                {l.seeTools}
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted sm:text-[13px]">{l.reassurance}</p>
          </div>
          <div className="relative lg:min-h-[540px]">
            <img
              src={couple}
              alt={l.images.couple}
              width={1200}
              height={654}
              fetchPriority="high"
              className="h-[300px] w-full rounded-t-[110px] rounded-b-lg object-cover object-[50%_35%] sm:h-[420px] lg:absolute lg:right-0 lg:top-0 lg:h-[380px] lg:w-[80%] lg:rounded-t-[150px]"
            />
            <div className="hidden lg:absolute lg:bottom-0 lg:left-0 lg:block lg:w-[82%] lg:max-w-[440px]">
              <PlannerPreview />
            </div>
          </div>
        </section>

        <nav
          aria-label={l.featuresTitle}
          className={cx(WRAP, 'grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line pb-6 md:grid-cols-4 md:gap-6')}
        >
          {l.shortcuts.map((label, i) => {
            const Icon = TOOL_ICONS[i];
            return (
              <a
                key={label}
                href={`#${SHORTCUT_IDS[i]}`}
                className={cx(
                  'flex min-h-12 items-center gap-2 rounded-lg text-xs font-semibold sm:gap-3 sm:text-sm',
                  FOCUS_RING,
                )}
              >
                <Icon className="shrink-0 text-accent" size={21} aria-hidden="true" />
                {label}
              </a>
            );
          })}
        </nav>

        <section
          id="planning-tools"
          aria-labelledby="landing-features"
          className={cx(WRAP, 'scroll-mt-8 py-14 lg:py-20')}
        >
          <p className={cx(LABEL, 'text-accent')}>{l.featuresTitle}</p>
          <h2 id="landing-features" className={cx(HEADING, 'mt-4')}>
            {l.featuresHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{l.body}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {l.features.map((feature, i) => {
              const Icon = TOOL_ICONS[i];
              return (
                <article
                  key={feature.title}
                  id={SHORTCUT_IDS[i]}
                  className="flex scroll-mt-8 flex-col rounded-2xl border border-line-subtle bg-surface p-5 lg:p-6"
                >
                  <ToolExample kind={i} />
                  <Icon className="mt-5 text-accent" size={24} aria-hidden="true" />
                  <h3 className="mt-3 font-serif text-2xl font-medium leading-snug">{feature.title}</h3>
                  <p className="mb-3 mt-3 text-sm leading-relaxed text-muted">{feature.body}</p>
                  <Link to={ctaPath} className={cx(TEXT_LINK, 'mt-auto self-start')}>
                    {feature.action}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">{l.examplesCaption}</p>
        </section>

        <section id="how-it-works" aria-labelledby="starting-title" className={cx(WRAP, 'scroll-mt-8 pb-14 lg:pb-20')}>
          <p className={cx(LABEL, 'text-accent')}>{l.gettingStarted.eyebrow}</p>
          <h2 id="starting-title" className={cx(HEADING, 'mt-4')}>
            {l.gettingStarted.title}
          </h2>
          <ol className="mt-8 grid gap-7 md:grid-cols-3 md:gap-10">
            {l.gettingStarted.steps.map((step, i) => (
              <li key={step.title}>
                <span className="font-serif text-2xl text-accent">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="budget-story-title"
          className={cx(WRAP, 'grid items-center gap-8 pb-14 lg:grid-cols-2 lg:gap-20 lg:pb-20')}
        >
          <div>
            <img
              src={reception}
              alt={l.images.reception}
              loading="lazy"
              width={850}
              height={740}
              className="h-60 w-full rounded-tl-[100px] rounded-br-lg object-cover sm:h-80 lg:h-[360px] lg:w-[78%]"
            />
            <div className="relative mx-1 -mt-4 rounded-xl border border-line bg-surface p-5 shadow-sm sm:ml-20 lg:-mt-36 lg:ml-28 lg:p-6">
              <p className={cx(LABEL, 'text-[10px] text-muted')}>{l.budgetStory.comparison}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[84000, 97500].map((amount, i) => (
                  <div key={amount}>
                    <p className="text-sm text-muted">{l.budgetStory.guests[i]}</p>
                    <p className="mt-1 font-serif text-[clamp(1.25rem,2.3vw,1.75rem)]">{formatMoney(amount, 'RON')}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-line-subtle pt-4 text-sm font-semibold text-accent">
                {l.budgetStory.difference}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{l.budgetStory.example}</p>
            </div>
          </div>
          <div>
            <p className={cx(LABEL, 'text-accent')}>{l.budgetStory.eyebrow}</p>
            <h2 id="budget-story-title" className={cx(HEADING, 'mt-4 max-w-lg')}>
              {l.budgetStory.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">{l.budgetStory.body}</p>
            <ul className="mt-5 space-y-3">
              {l.budgetStory.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 shrink-0 text-accent" size={17} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link to={ctaPath} className={cx(TEXT_LINK, 'mt-5')}>
              {l.budgetStory.action}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section id="shared-planning" aria-labelledby="team-title" className={cx(WRAP, 'scroll-mt-8 pb-14 lg:pb-20')}>
          <div className="grid gap-7 rounded-2xl bg-soft p-6 sm:p-9 lg:grid-cols-2 lg:gap-16 lg:p-11">
            <div>
              <p className={cx(LABEL, 'leading-relaxed text-accent')}>{l.team.eyebrow}</p>
              <h2 id="team-title" className={cx(HEADING, 'mt-4 max-w-lg')}>
                {l.team.title}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted">{l.team.body}</p>
              <p className="mt-4 text-sm font-semibold leading-relaxed">{l.team.lists}</p>
            </div>
            <div className="rounded-xl bg-surface p-5 sm:p-6">
              <h3 className="font-serif text-2xl font-medium">{l.team.listTitle}</h3>
              <p className="mt-2 text-xs text-muted">{l.team.listSubtitle}</p>
              <dl className="mt-4 divide-y divide-line-subtle">
                {l.team.suppliers.map((supplier) => (
                  <div key={supplier.name} className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-sm">{supplier.name}</dt>
                    <dd className="text-right text-xs font-medium text-accent">{supplier.status}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-muted">{l.team.example}</p>
            </div>
          </div>
        </section>

        <section
          id="questions"
          aria-labelledby="faq-title"
          className={cx(WRAP, 'grid scroll-mt-8 gap-8 pb-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20 lg:pb-20')}
        >
          <div>
            <p className={cx(LABEL, 'text-accent')}>{l.faq.eyebrow}</p>
            <h2 id="faq-title" className={cx(HEADING, 'mt-4')}>
              {l.faq.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{l.faq.body}</p>
          </div>
          <dl className="space-y-5">
            {l.faq.questions.map((item) => (
              <div key={item.question} className="border-b border-line-subtle pb-5">
                <dt className="text-base font-semibold">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="closing-title" className={cx(WRAP, 'pb-12')}>
          <div className="grid items-center gap-8 rounded-2xl bg-accent-solid p-6 text-on-accent sm:p-9 lg:grid-cols-[1fr_215px] lg:p-10">
            <div>
              <h2 id="closing-title" className={HEADING}>
                {l.closing.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed">{l.closing.body}</p>
              <Link
                to={ctaPath}
                className={cx(
                  'mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-bg px-6 text-sm font-semibold text-accent hover:opacity-90',
                  FOCUS_RING,
                )}
              >
                {ctaLabel}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <img
              src={bouquet}
              alt={l.images.bouquet}
              loading="lazy"
              width={430}
              height={340}
              className="hidden h-[170px] w-full rounded-lg object-cover lg:block"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-line-subtle">
        <div
          className={cx(
            WRAP,
            'flex flex-col items-center justify-between gap-3 py-6 text-center text-xs text-muted md:flex-row md:text-left',
          )}
        >
          <p>{l.footerPrivacy}</p>
          <div className="flex flex-wrap justify-center gap-x-5">
            <Link to={paths.privacy} className={cx(TEXT_LINK, 'text-xs')}>
              {l.privacy}
            </Link>
            <Link to={paths.terms} className={cx(TEXT_LINK, 'text-xs')}>
              {l.terms}
            </Link>
          </div>
          <p>
            {l.haveAccount}{' '}
            <Link to={paths.login} className={cx(TEXT_LINK, 'text-xs')}>
              {l.haveAccountLink}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function ToolExample({ kind }: { kind: number }) {
  const s = useT().landing.samples;
  return (
    <div className={cx('min-h-[184px] rounded-lg p-4 text-sm', kind === 1 ? 'bg-warm-card' : 'bg-sunken')}>
      <p className={cx(LABEL, 'text-[10px] text-muted')}>{[s.checklistLabel, s.budgetLabel, s.guestLabel][kind]}</p>
      {kind === 0 && (
        <>
          <ul className="mt-4 space-y-3">
            {s.tasks.map((task, i) => {
              const Icon = i === 0 ? CircleCheck : Circle;
              return (
                <li key={task} className="flex items-center gap-2 text-xs">
                  <Icon size={16} className="shrink-0 text-accent" aria-hidden="true" />
                  {task}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-accent">{s.owners}</p>
        </>
      )}
      {kind === 1 && (
        <>
          <p className="mt-3 font-serif text-3xl">{formatMoney(84000, 'RON')}</p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{s.paid}</dt>
              <dd>{formatMoney(24000, 'RON')}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{s.remaining}</dt>
              <dd>{formatMoney(60000, 'RON')}</dd>
            </div>
          </dl>
          <div aria-hidden="true" className="mt-3 h-1.5 rounded-full bg-warm-line">
            <div className="h-full w-[28.57%] rounded-full bg-accent-solid" />
          </div>
        </>
      )}
      {kind === 2 && (
        <>
          <p className="mt-3 font-serif text-xl">{s.guestCount}</p>
          <dl className="mt-4 space-y-3 text-xs">
            {s.households.map((household, i) => (
              <div key={household} className="flex justify-between gap-3">
                <dt>{household}</dt>
                <dd className="text-right font-medium text-accent">{s.statuses[i]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{s.rsvp}</p>
        </>
      )}
    </div>
  );
}

/** Miniatură decorativă a ecranului Acasă: date de exemplu, fără legătură cu datele reale. */
function PlannerPreview() {
  const t = useT();
  const p = t.landing.preview;
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs font-semibold">
        <span className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-lg bg-soft font-serif text-xs text-accent">
            N
          </span>
          {p.brand}
        </span>
        <span className="text-muted">{p.date}</span>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="font-serif text-xl font-medium leading-snug">{p.greeting}</p>
          <p className="mt-0.5 text-xs text-muted">{p.untilWedding}</p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-hero p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{p.countdownEyebrow}</p>
            <div className="mt-3 h-1.5 w-32 max-w-full rounded-full bg-soft">
              <div className="h-full w-[64%] rounded-full bg-progress" />
            </div>
          </div>
          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full bg-soft">
            <span className="font-serif text-2xl leading-none">110</span>
            <span className="text-[9px] font-medium text-muted">{p.days}</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold">{p.next}</p>
            <p className="text-[10px] text-muted">{p.progress}</p>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {p.tasks.map((task) => (
              <li key={task.title} className="flex items-center gap-3 py-2.5">
                <span
                  className={cx(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
                    task.done ? 'bg-accent-solid text-on-accent' : 'border border-line text-faint',
                  )}
                >
                  {task.done && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium">{task.title}</span>
                <span className="text-[10px] text-muted">{task.due}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
