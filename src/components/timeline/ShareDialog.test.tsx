import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getMessages } from '../../i18n';
import { ShareDialog } from './ShareDialog';

const t = getMessages();

describe('ShareDialog', () => {
  const html = renderToStaticMarkup(<ShareDialog open weddingId="w1" weddingName="Ana & Mihai" onClose={vi.fn()} />);

  it('explains what is shared and that a new link replaces the old one', () => {
    expect(html).toContain(t.timeline.shareTitle);
    expect(html).toContain(t.timeline.shareIntro);
    expect(html).toContain(t.timeline.shareReplaces);
  });

  it('offers to create a link and to stop sharing, but shows no link before one is created', () => {
    expect(html).toContain(t.timeline.shareCreate);
    expect(html).toContain(t.timeline.shareStop);
    expect(html).not.toContain(t.timeline.shareCopy);
    expect(html).not.toContain(t.timeline.shareWhatsapp);
    expect(html).not.toContain(t.timeline.shareStopConfirm);
  });
});
