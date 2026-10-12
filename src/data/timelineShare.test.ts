import { describe, expect, it } from 'vitest';
import { sharedTimelineFromJson } from './timelineShare';

const event = (over: Record<string, unknown> = {}) => ({
  title: 'Cununia',
  startTime: '16:00',
  durationMinutes: 60,
  location: 'Biserica',
  notes: 'Verighetele',
  ...over,
});

describe('sharedTimelineFromJson', () => {
  it('reads a full response', () => {
    expect(
      sharedTimelineFromJson({ weddingName: 'Ana & Mihai', date: '2027-06-12', city: 'Brașov', events: [event()] }),
    ).toEqual({
      weddingName: 'Ana & Mihai',
      date: '2027-06-12',
      city: 'Brașov',
      events: [
        { title: 'Cununia', startTime: '16:00', durationMinutes: 60, location: 'Biserica', notes: 'Verighetele' },
      ],
    });
  });

  it('falls back on missing or malformed fields', () => {
    expect(sharedTimelineFromJson(null)).toEqual({ weddingName: '', date: null, city: null, events: [] });
    expect(sharedTimelineFromJson('x')).toEqual({ weddingName: '', date: null, city: null, events: [] });
    const t = sharedTimelineFromJson({ weddingName: 5, date: 'not a date', city: '', events: 'nope' });
    expect(t).toEqual({ weddingName: '', date: null, city: null, events: [] });
  });

  it('skips events without a title or with a bad time, keeping the order of the rest', () => {
    const t = sharedTimelineFromJson({
      events: [
        event({ title: 'Primul' }),
        event({ title: '  ' }),
        event({ title: 'Ora rea', startTime: '25:99' }),
        null,
        event({ title: 'Ultimul', startTime: '23:30' }),
      ],
    });
    expect(t.events.map((e) => e.title)).toEqual(['Primul', 'Ultimul']);
  });

  it('keeps a duration only when it is a positive whole number', () => {
    const durations = [60, null, 0, -5, 1.5, '60'].map(
      (durationMinutes) => sharedTimelineFromJson({ events: [event({ durationMinutes })] }).events[0].durationMinutes,
    );
    expect(durations).toEqual([60, null, null, null, null, null]);
  });
});
