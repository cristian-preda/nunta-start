import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keys } from '../lib/queryKeys';
import type { ServerTimelineEvent } from './mappers';
import { insertTimelineEvent, updateTimelineEvent } from './timeline';
import { type TimelineActions, useTimelineActions } from './timelineActions';

vi.mock('./timeline', () => ({
  insertTimelineEvent: vi.fn().mockResolvedValue(undefined),
  updateTimelineEvent: vi.fn().mockResolvedValue(undefined),
  deleteTimelineEvent: vi.fn().mockResolvedValue(undefined),
  listTimelineEvents: vi.fn().mockResolvedValue([]),
}));

const W = 'w1';
const key = keys.wedding(W).timeline();

const ev = (id: string, startTime: string, position: number): ServerTimelineEvent => ({
  id,
  title: `Eveniment ${id}`,
  startTime,
  durationMinutes: null,
  location: '',
  notes: '',
  position,
});

const day = () => [ev('a', '10:00', 0), ev('b', '14:00', 10), ev('c', '20:00', 20)];
const draft = (over: Partial<Omit<ServerTimelineEvent, 'id' | 'position'>> = {}) => ({
  title: 'Nou',
  startTime: '12:00',
  durationMinutes: null,
  location: '',
  notes: '',
  ...over,
});

function setup(events: ServerTimelineEvent[] = day()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(key, events);
  let actions: TimelineActions | undefined;
  function Probe() {
    actions = useTimelineActions(W);
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!actions) throw new Error('actions not captured');
  const ids = () => (queryClient.getQueryData<ServerTimelineEvent[]>(key) ?? []).map((e) => e.id);
  return { actions, ids, queryClient };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => vi.clearAllMocks());

describe('useTimelineActions', () => {
  it('adds an event at its place by time, optimistically, and sends that position', async () => {
    const { actions, ids } = setup();
    const id = actions.addEvent(draft({ startTime: '12:00' }));
    await settle();
    expect(ids()).toEqual(['a', id, 'b', 'c']);
    expect(insertTimelineEvent).toHaveBeenCalledWith(
      W,
      expect.objectContaining({ id, position: 5, startTime: '12:00' }),
    );
  });

  it('moves an event up between its new neighbours', async () => {
    const { actions, ids } = setup();
    actions.moveEvent('c', -1);
    await settle();
    expect(ids()).toEqual(['a', 'c', 'b']);
    expect(updateTimelineEvent).toHaveBeenCalledWith('c', { position: 5 });
  });

  it('moves an event down to the end', async () => {
    const { actions, ids } = setup();
    actions.moveEvent('b', 1);
    await settle();
    expect(ids()).toEqual(['a', 'c', 'b']);
    expect(updateTimelineEvent).toHaveBeenCalledWith('b', { position: 30 });
  });

  it('does nothing at the ends of the list', async () => {
    const { actions, ids } = setup();
    actions.moveEvent('a', -1);
    actions.moveEvent('c', 1);
    await settle();
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(updateTimelineEvent).not.toHaveBeenCalled();
  });

  it('sends only the changed fields, without a position when the time is the same', async () => {
    const { actions } = setup();
    actions.updateEvent('b', draft({ title: 'Cununia', startTime: '14:00' }));
    await settle();
    expect(updateTimelineEvent).toHaveBeenCalledWith('b', { title: 'Cununia' });
  });

  it('puts an event in its new place when its time changes', async () => {
    const { actions, ids } = setup();
    actions.updateEvent('a', { ...draft({ startTime: '16:00' }), title: 'Eveniment a' });
    await settle();
    expect(ids()).toEqual(['b', 'a', 'c']);
    expect(updateTimelineEvent).toHaveBeenCalledWith('a', { start_time: '16:00', position: 15 });
  });

  it('sends nothing when nothing changed', async () => {
    const { actions } = setup();
    actions.updateEvent('b', {
      title: 'Eveniment b',
      startTime: '14:00',
      durationMinutes: null,
      location: '',
      notes: '',
    });
    await settle();
    expect(updateTimelineEvent).not.toHaveBeenCalled();
  });

  it('can clear the duration', async () => {
    const { actions } = setup([{ ...ev('a', '10:00', 0), durationMinutes: 30 }]);
    actions.updateEvent('a', { ...draft({ startTime: '10:00' }), title: 'Eveniment a', durationMinutes: null });
    await settle();
    expect(updateTimelineEvent).toHaveBeenCalledWith('a', { duration_minutes: null });
  });

  it('removes an event from the list', async () => {
    const { actions, ids } = setup();
    actions.removeEvent('b');
    await settle();
    expect(ids()).toEqual(['a', 'c']);
  });
});
