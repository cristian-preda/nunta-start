import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMessages } from '../i18n';
import type { SharedTimeline } from '../lib/timelineShare';
import { SharedTimelineView } from './SharedTimeline';

const t = getMessages();

const timeline: SharedTimeline = {
  weddingName: 'Ana & Mihai',
  date: '2027-06-12',
  city: 'Brașov',
  events: [
    {
      title: 'Cununia',
      startTime: '16:00',
      durationMinutes: 90,
      location: 'Biserica Sf. Nicolae',
      notes: 'Verighetele',
    },
    { title: 'Petrecerea', startTime: '19:30', durationMinutes: null, location: '', notes: '' },
  ],
};

const render = (over: Partial<SharedTimeline> = {}) =>
  renderToStaticMarkup(<SharedTimelineView timeline={{ ...timeline, ...over }} />);

describe('SharedTimelineView', () => {
  it('shows the wedding, its day and the events in order with times and places', () => {
    const html = render();
    expect(html).toContain('Ana &amp; Mihai');
    expect(html).toContain('Brașov');
    expect(html).toContain('2027');
    expect(html.indexOf('Cununia')).toBeLessThan(html.indexOf('Petrecerea'));
    expect(html).toContain('16:00');
    expect(html).toContain(t.timeline.until('17:30'));
    expect(html).toContain('1 h 30 min');
    expect(html).toContain('Biserica Sf. Nicolae');
    expect(html).toContain('Verighetele');
  });

  it('is read-only: no edit, move or share controls, just print', () => {
    const html = render();
    expect(html).toContain(t.sharedTimeline.print);
    expect(html).not.toContain(t.timeline.share);
    expect(html).not.toContain(t.timeline.newEvent);
    expect(html).not.toContain(`aria-label="${t.timeline.edit('Cununia')}`);
  });

  it('hides the screen-only parts when printing', () => {
    const html = render();
    expect(html).toMatch(/<footer[^>]*print:hidden/);
    expect(html).not.toMatch(/<h1[^>]*print:hidden/);
  });

  it('copes with a wedding that has no name, date or city', () => {
    const html = render({ weddingName: '', date: null, city: null });
    expect(html).toContain(t.sharedTimeline.eyebrow);
    expect(html).toContain('Cununia');
  });

  it('says so when there are no events', () => {
    const html = render({ events: [] });
    expect(html).toContain(t.sharedTimeline.empty);
    expect(html).not.toContain('<ol');
  });
});
