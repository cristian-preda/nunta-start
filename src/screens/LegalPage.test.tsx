import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { legalEn } from '../content/legal/en';
import { legalRo } from '../content/legal/ro';
import { getMessages } from '../i18n';
import { LegalPage } from './LegalPage';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const t = getMessages('ro');

describe('LegalPage', () => {
  it.each(['privacy', 'terms'] as const)('%s: one h1, a draft banner, and every section as an h2', (doc) => {
    const html = renderToStaticMarkup(<LegalPage doc={doc} />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(t.legal.draft);
    expect(html).toContain('role="alert"');
    for (const s of legalRo[doc]) expect(html).toContain(`id="${s.id}"`);
    expect(html.match(/<h2/g)).toHaveLength(legalRo[doc].length);
  });

  it('keeps the draft banner honest about the missing legal review in both languages', () => {
    expect(t.legal.draft).toMatch(/jurist/);
    const en = getMessages('en');
    expect(en.legal.draft).toMatch(/not yet been reviewed by a lawyer/);
  });

  it('names the real sub-processors in both languages', () => {
    for (const content of [legalRo, legalEn]) {
      const text = content.privacy.flatMap((s) => s.paragraphs).join('\n');
      for (const name of ['Supabase', 'Cloudflare', 'Turnstile', 'Resend', 'Grafana', 'Google']) {
        expect(text).toContain(name);
      }
    }
  });

  it('marks operator identity placeholders visibly in both languages', () => {
    for (const content of [legalRo, legalEn]) {
      expect(content.privacy.flatMap((s) => s.paragraphs).join('\n')).toContain('[DE COMPLETAT');
    }
  });
});
