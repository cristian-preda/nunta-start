import type { TimelineEvent } from '../domain/timeline';
import type { Messages } from '../i18n';

/**
 * Contractul cu Edge Function-ul `timeline-share` (NS-122). Pagina `/t/:token` e scrisă peste el:
 *
 *   GET timeline-share/<token>  ->  200 SharedTimeline | 404 (token necunoscut, oprit sau înlocuit)
 */
export type SharedEvent = Omit<TimelineEvent, 'id'>;

export interface SharedTimeline {
  /** Numele nunții, de ex. „Ana & Mihai"; gol dacă nu se știe. */
  weddingName: string;
  /** Data nunții (ISO), dacă e cunoscută. */
  date: string | null;
  city: string | null;
  /** În ordinea zilei. */
  events: SharedEvent[];
}

export interface TimelineShareClient {
  fetchTimeline(token: string): Promise<SharedTimeline>;
}

/** Tokenul nu corespunde niciun program (404). */
export class TimelineShareNotFoundError extends Error {
  constructor() {
    super('Timeline share token not found');
    this.name = 'TimelineShareNotFoundError';
  }
}

/** Funcția `timeline-share` nu e configurată (fără Supabase). */
export class TimelineShareNotConfiguredError extends Error {
  constructor() {
    super('Timeline sharing is not configured');
    this.name = 'TimelineShareNotConfiguredError';
  }
}

export const notConfiguredTimelineShareClient: TimelineShareClient = {
  fetchTimeline: () => Promise.reject(new TimelineShareNotConfiguredError()),
};

export type ShareErrorKind = 'notFound' | 'notConfigured' | 'network' | 'generic';

export function shareErrorKind(error: unknown): ShareErrorKind {
  if (error instanceof TimelineShareNotFoundError) return 'notFound';
  if (error instanceof TimelineShareNotConfiguredError) return 'notConfigured';
  if (error instanceof TypeError) return 'network';
  return 'generic';
}

export function shareErrorMessage(kind: Exclude<ShareErrorKind, 'notFound'>, t: Messages): string {
  return t.sharedTimeline.errors[kind];
}
