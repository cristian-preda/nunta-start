/** Un eveniment din programul zilei nunții. Ora e „HH:MM", ora locului (fără fus orar). */
export interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  /** Durata în minute; `null` când nu se știe. */
  durationMinutes: number | null;
  location: string;
  notes: string;
}

export const MAX_DURATION_MINUTES = 24 * 60;
export const MAX_TITLE_LENGTH = 120;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME.test(value);
}

/** Minutele de la miezul nopții; ora trebuie să fie validă. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const day = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(day / 60)).padStart(2, '0')}:${String(day % 60).padStart(2, '0')}`;
}

/** Ora de sfârșit (trece peste miezul nopții la nevoie); `null` fără durată. */
export function endTime(start: string, durationMinutes: number | null): string | null {
  if (durationMinutes === null || !isValidTime(start)) return null;
  return fromMinutes(toMinutes(start) + durationMinutes);
}

/** Ora din coloana `time` a bazei („14:30:00") în „14:30". */
export function timeFromDb(value: string): string {
  return value.slice(0, 5);
}

export type EventErrors = Partial<Record<'title' | 'startTime' | 'duration', true>>;

/** Ce nu e în regulă într-un eveniment; obiect gol = valid. `duration` e textul din câmp (gol = necunoscută). */
export function validateEvent(input: { title: string; startTime: string; duration: string }): EventErrors {
  const errors: EventErrors = {};
  if (input.title.trim() === '') errors.title = true;
  if (!isValidTime(input.startTime)) errors.startTime = true;
  if (input.duration.trim() !== '' && parseDuration(input.duration) === null) errors.duration = true;
  return errors;
}

/** Durata din câmp: număr întreg între 1 și 1440 de minute; gol sau invalid dă `null`. */
export function parseDuration(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 && n <= MAX_DURATION_MINUTES ? n : null;
}

/** „1 h 30 min", „45 min", „2 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

type Positioned = Pick<TimelineEvent, 'id' | 'startTime'> & { position: number };

/** Poziția celor doi vecini între care cade un eveniment (`null` = capătul listei). */
export type Neighbours = readonly [before: number | null, after: number | null];

const inOrder = <T extends { position: number }>(events: readonly T[]): T[] =>
  [...events].sort((a, b) => a.position - b.position);

/**
 * Vecinii unui eveniment pus la ora dată: înaintea primului eveniment mai târziu din prima parte a zilei.
 * Prima parte e șirul de evenimente cu ora crescătoare, până la primul „salt înapoi" (un eveniment de după
 * miezul nopții); acelea se mută de mână cu săgețile. `ignoreId` scoate evenimentul pe care îl mutăm.
 */
export function neighboursForTime(events: readonly Positioned[], startTime: string, ignoreId?: string): Neighbours {
  const list = inOrder(events).filter((e) => e.id !== ignoreId);
  const at = toMinutes(startTime);
  let prev: Positioned | null = null;
  for (const event of list) {
    const minutes = toMinutes(event.startTime);
    const wrapped = prev !== null && minutes < toMinutes(prev.startTime);
    if (wrapped || minutes > at) return [prev?.position ?? null, event.position];
    prev = event;
  }
  return [prev?.position ?? null, null];
}

/** Vecinii noii poziții după o mutare cu un loc în sus (-1) sau în jos (+1); `null` la capătul listei. */
export function neighboursAfterMove(events: readonly Positioned[], id: string, direction: -1 | 1): Neighbours | null {
  const list = inOrder(events);
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return null;
  const target = index + direction;
  if (target < 0 || target >= list.length) return null;
  if (direction === -1) return [list[target - 1]?.position ?? null, list[target].position];
  return [list[target].position, list[target + 1]?.position ?? null];
}

/**
 * Ora propusă pentru un eveniment nou: sfârșitul ultimului (sau începutul lui, fără durată); 12:00 pe o listă
 * goală. Un sfârșit de după miezul nopții nu se propune: ora mică ar așeza evenimentul nou în capul listei.
 */
export function suggestStartTime(
  events: readonly Positioned[] & readonly Pick<TimelineEvent, 'durationMinutes'>[],
): string {
  const last = [...events].sort((a, b) => a.position - b.position).at(-1);
  if (!last) return '12:00';
  const passesMidnight = last.durationMinutes !== null && toMinutes(last.startTime) + last.durationMinutes >= 1440;
  return (!passesMidnight && endTime(last.startTime, last.durationMinutes)) || last.startTime;
}
