import { describe, expect, it } from 'vitest';
import { printInLightTheme } from './printLight';

function setup(theme?: string) {
  const handlers: Record<string, () => void> = {};
  const target = {
    addEventListener: (type: string, fn: () => void) => {
      handlers[type] = fn;
    },
    removeEventListener: (type: string) => {
      delete handlers[type];
    },
  };
  const root = { dataset: (theme ? { theme } : {}) as DOMStringMap };
  const stop = printInLightTheme(target, root);
  return { handlers, root, stop };
}

describe('printInLightTheme', () => {
  it('forces the light theme while printing and restores a chosen theme after', () => {
    const { handlers, root } = setup('dark');
    handlers.beforeprint();
    expect(root.dataset.theme).toBe('light');
    handlers.afterprint();
    expect(root.dataset.theme).toBe('dark');
  });

  it('removes the attribute again when none was set (system theme)', () => {
    const { handlers, root } = setup();
    handlers.beforeprint();
    expect(root.dataset.theme).toBe('light');
    handlers.afterprint();
    expect('theme' in root.dataset).toBe(false);
  });

  it('keeps the first theme if beforeprint fires twice', () => {
    const { handlers, root } = setup('dark');
    handlers.beforeprint();
    handlers.beforeprint();
    handlers.afterprint();
    expect(root.dataset.theme).toBe('dark');
  });

  it('restores and detaches on cleanup, even in the middle of a print', () => {
    const { handlers, root, stop } = setup('dark');
    handlers.beforeprint();
    stop();
    expect(root.dataset.theme).toBe('dark');
    expect(Object.keys(handlers)).toEqual([]);
  });

  it('does nothing on afterprint without a beforeprint', () => {
    const { handlers, root } = setup('dark');
    handlers.afterprint();
    expect(root.dataset.theme).toBe('dark');
  });
});
