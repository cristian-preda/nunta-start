import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerTimelineEvent } from '../data/mappers';
import { getMessages } from '../i18n';
import { Timeline } from './Timeline';

const state = vi.hoisted(() => ({ events: [] as ServerTimelineEvent[], editable: true }));

vi.mock('../data/hooks', () => ({ useTimeline: () => state.events }));
vi.mock('../data/timelineActions', () => ({
  useTimelineActions: () => ({ addEvent: vi.fn(), updateEvent: vi.fn(), removeEvent: vi.fn(), moveEvent: vi.fn() }),
}));
vi.mock('../lib/wedding', () => ({
  useWedding: () => ({ id: 'w1', wedding: { name: 'Ana & Mihai' }, canEdit: () => state.editable }),
}));

const t = getMessages();

const ev = (
  over: Partial<ServerTimelineEvent> & Pick<ServerTimelineEvent, 'id' | 'position'>,
): ServerTimelineEvent => ({
  title: `Eveniment ${over.id}`,
  startTime: '10:00',
  durationMinutes: null,
  location: '',
  notes: '',
  ...over,
});

const render = () => renderToStaticMarkup(<Timeline />);
const button = (html: string, label: string) =>
  new RegExp(`<button[^>]*aria-label="${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`).exec(html)?.[0];

beforeEach(() => {
  state.events = [];
  state.editable = true;
});

describe('Timeline screen', () => {
  it('shows the empty state and the add button on an empty schedule', () => {
    const html = render();
    expect(html).toContain(t.timeline.emptyTitle);
    expect(html).toContain(t.timeline.newEvent);
    expect(html).toContain(t.timeline.share);
    expect(html).toContain(t.timeline.shareTitle);
  });

  it('lists the events in position order with their times, place and notes', () => {
    state.events = [
      ev({ id: 'b', position: 20, startTime: '20:00', title: 'Tortul' }),
      ev({
        id: 'a',
        position: 10,
        startTime: '15:00',
        durationMinutes: 90,
        title: 'Cununia',
        location: 'Biserica Sf. Nicolae',
        notes: 'Aduceți verighetele',
      }),
    ];
    const html = render();
    expect(html.indexOf('Cununia')).toBeGreaterThan(-1);
    expect(html.indexOf('Cununia')).toBeLessThan(html.indexOf('Tortul'));
    expect(html).toContain('15:00');
    expect(html).toContain(t.timeline.until('16:30'));
    expect(html).toContain('1 h 30 min');
    expect(html).toContain('Biserica Sf. Nicolae');
    expect(html).toContain('Aduceți verighetele');
  });

  it('disables moving the first event up and the last one down', () => {
    state.events = [ev({ id: 'a', position: 1 }), ev({ id: 'b', position: 2 }), ev({ id: 'c', position: 3 })];
    const html = render();
    expect(button(html, t.timeline.moveUp('Eveniment a'))).toContain(' disabled=""');
    expect(button(html, t.timeline.moveUp('Eveniment b'))).not.toContain(' disabled=""');
    expect(button(html, t.timeline.moveDown('Eveniment b'))).not.toContain(' disabled=""');
    expect(button(html, t.timeline.moveDown('Eveniment c'))).toContain(' disabled=""');
  });

  it('is read-only for someone who cannot edit: no add, move or edit controls', () => {
    state.editable = false;
    state.events = [ev({ id: 'a', position: 1 })];
    const html = render();
    expect(html).toContain(t.timeline.readOnly);
    expect(html).toContain('Eveniment a');
    expect(html).not.toContain(t.timeline.newEvent);
    expect(html).not.toContain(t.timeline.share);
    expect(html).not.toContain(t.timeline.shareTitle);
    expect(button(html, t.timeline.edit('Eveniment a'))).toBeUndefined();
    expect(button(html, t.timeline.moveUp('Eveniment a'))).toBeUndefined();
  });
});
