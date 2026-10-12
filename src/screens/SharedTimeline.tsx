import { useParams } from '@tanstack/react-router';
import { CalendarClock, Loader2, MapPin, Printer, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PublicShell } from '../components/PublicShell';
import { Banner, Button, Heading } from '../components/ui';
import { supabaseTimelineShareClient } from '../data/timelineShare';
import { parseISODate } from '../domain/dates';
import { endTime, formatDuration } from '../domain/timeline';
import { useT } from '../i18n';
import { isAuthConfigured } from '../lib/auth';
import { formatLongDate } from '../lib/format';
import { printInLightTheme } from '../lib/printLight';
import {
  notConfiguredTimelineShareClient,
  type SharedTimeline,
  type ShareErrorKind,
  shareErrorKind,
  shareErrorMessage,
  type TimelineShareClient,
} from '../lib/timelineShare';
import { pageTitle, useDocumentTitle } from '../lib/useDocumentTitle';

const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';

/** Pagina `/t/:token`: programul zilei, în citire, fără cont și fără meniul aplicației; se tipărește curat. */
export function SharedTimelineRoute() {
  const { token } = useParams({ strict: false });
  // `key`: la schimbarea tokenului, pagina se montează de la zero.
  return (
    <SharedTimelinePage
      key={token}
      token={token ?? ''}
      client={isAuthConfigured() ? supabaseTimelineShareClient : notConfiguredTimelineShareClient}
    />
  );
}

type Load =
  | { status: 'loading' }
  | { status: 'ready'; timeline: SharedTimeline }
  | { status: 'error'; kind: ShareErrorKind };

export function SharedTimelinePage({ token, client }: { token: string; client: TimelineShareClient }) {
  const t = useT();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useDocumentTitle(pageTitle(t.sharedTimeline.eyebrow, t.appName));

  // Linkul e personal: motoarele de căutare nu-l indexează cât pagina e deschisă.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.append(meta);
    return () => meta.remove();
  }, []);

  // La tipărire pagina e mereu luminoasă, chiar dacă cititorul folosește tema întunecată.
  useEffect(() => printInLightTheme(window, document.documentElement), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` repornește încărcarea la „Încercați din nou".
  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    client.fetchTimeline(token).then(
      (timeline) => {
        if (!cancelled) setLoad({ status: 'ready', timeline });
      },
      (error: unknown) => {
        if (!cancelled) setLoad({ status: 'error', kind: shareErrorKind(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [client, token, attempt]);

  return (
    <PublicShell>
      <div className="w-full max-w-2xl">
        {load.status === 'loading' && (
          <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {t.sharedTimeline.loading}
          </p>
        )}
        {load.status === 'error' && load.kind === 'notFound' && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-minus/10 text-minus">
              <Unlink size={22} aria-hidden="true" />
            </span>
            <Heading as="h1" size="lg">
              {t.sharedTimeline.notFoundTitle}
            </Heading>
            <p className="max-w-sm text-sm text-muted">{t.sharedTimeline.notFoundBody}</p>
          </div>
        )}
        {load.status === 'error' && load.kind !== 'notFound' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Heading as="h1" size="lg">
              {t.sharedTimeline.errorTitle}
            </Heading>
            <Banner tone="warn">{shareErrorMessage(load.kind, t)}</Banner>
            <Button onClick={() => setAttempt(attempt + 1)}>{t.sharedTimeline.retry}</Button>
          </div>
        )}
        {load.status === 'ready' && <SharedTimelineView timeline={load.timeline} />}
      </div>
    </PublicShell>
  );
}

/** Programul în sine, fără încărcare: antet, evenimentele în ordine, nota de citire și butonul de tipărire. */
export function SharedTimelineView({ timeline }: { timeline: SharedTimeline }) {
  const t = useT();
  const when = [timeline.date ? formatLongDate(parseISODate(timeline.date)) : '', timeline.city ?? '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="print:text-black">
      <header className="mb-6 text-center md:text-left print:mb-4 print:text-left">
        <p className={EYEBROW}>{t.sharedTimeline.eyebrow}</p>
        <Heading as="h1" size="lg" className="mt-2 max-md:text-[1.6rem] md:text-[1.9rem]">
          {timeline.weddingName || t.sharedTimeline.eyebrow}
        </Heading>
        {when && <p className="mt-1 text-sm text-muted print:text-black">{when}</p>}
      </header>

      {timeline.events.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-sm text-muted">
          <CalendarClock size={16} aria-hidden="true" />
          {t.sharedTimeline.empty}
        </p>
      ) : (
        <ol aria-label={t.sharedTimeline.eyebrow} className="border-t border-line">
          {timeline.events.map((event, index) => {
            const end = endTime(event.startTime, event.durationMinutes);
            return (
              // Poziția în listă e identitatea: funcția publică nu trimite id-uri.
              // biome-ignore lint/suspicious/noArrayIndexKey: the list is read-only and never reordered on this page.
              <li key={index} className="flex gap-4 border-b border-line py-3 break-inside-avoid">
                <div className="w-20 shrink-0">
                  <p className="font-serif text-xl leading-tight tabular-nums">{event.startTime}</p>
                  {end && <p className="text-xs text-muted tabular-nums print:text-black">{t.timeline.until(end)}</p>}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold">{event.title}</h2>
                  {(event.location || event.durationMinutes !== null) && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted print:text-black">
                      {event.location && (
                        <span className="inline-flex items-center gap-1 break-words">
                          <MapPin size={14} aria-hidden="true" />
                          {event.location}
                        </span>
                      )}
                      {event.durationMinutes !== null && <span>{formatDuration(event.durationMinutes)}</span>}
                    </p>
                  )}
                  {event.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{event.notes}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="mt-6 flex flex-col items-center gap-3 print:hidden md:flex-row md:justify-between">
        <p className="text-center text-xs text-muted md:text-left">{t.sharedTimeline.note}</p>
        <Button variant="ghost" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          {t.sharedTimeline.print}
        </Button>
      </footer>
    </article>
  );
}
