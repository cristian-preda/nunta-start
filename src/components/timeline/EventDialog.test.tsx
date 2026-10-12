import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getMessages } from '../../i18n';
import { EventDialog } from './EventDialog';

const t = getMessages();
const event = {
  id: 'e1',
  title: 'Cununia',
  startTime: '15:00',
  durationMinutes: 30,
  location: '',
  notes: '',
};

const render = (props: Partial<Parameters<typeof EventDialog>[0]> = {}) =>
  renderToStaticMarkup(<EventDialog open defaultStart="12:00" onSubmit={vi.fn()} onClose={vi.fn()} {...props} />);

describe('EventDialog', () => {
  it('is an add form without a delete button for a new event', () => {
    const html = render();
    expect(html).toContain(t.timeline.newTitle);
    expect(html).toContain(t.timeline.add);
    expect(html).not.toContain(t.timeline.delete);
  });

  it('offers a first, unconfirmed delete step when editing', () => {
    const html = render({ event, onDelete: vi.fn() });
    expect(html).toContain(t.timeline.editTitle);
    expect(html).toContain(t.timeline.save);
    expect(html).toContain(t.timeline.delete);
    expect(html).not.toContain(t.timeline.confirmDelete);
    expect(html).not.toContain(t.timeline.deleteWarning);
  });

  it('starts a new event at the suggested time', () => {
    expect(render({ defaultStart: '17:30' })).toContain('value="17:30"');
  });

  it('shows no validation errors before the first try', () => {
    const html = render();
    for (const message of [t.timeline.errorTitle, t.timeline.errorTime, t.timeline.errorDuration]) {
      expect(html).not.toContain(message);
    }
  });
});
