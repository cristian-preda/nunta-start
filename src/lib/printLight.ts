interface PrintTarget {
  addEventListener(type: 'beforeprint' | 'afterprint', listener: () => void): void;
  removeEventListener(type: 'beforeprint' | 'afterprint', listener: () => void): void;
}

/**
 * Cât se tipărește, pagina are tema luminoasă, oricare ar fi tema aleasă: textul deschis de pe fundalul
 * întunecat ar ieși palid pe hârtie. Pune `data-theme="light"` la `beforeprint` și restaurează la `afterprint`.
 * Întoarce funcția de curățare (restaurează și scoate ascultătorii).
 */
export function printInLightTheme(target: PrintTarget, root: { dataset: DOMStringMap }): () => void {
  let forced = false;
  let previous: string | undefined;
  const before = () => {
    if (forced) return;
    previous = root.dataset.theme;
    root.dataset.theme = 'light';
    forced = true;
  };
  const after = () => {
    if (!forced) return;
    if (previous === undefined) delete root.dataset.theme;
    else root.dataset.theme = previous;
    forced = false;
  };
  target.addEventListener('beforeprint', before);
  target.addEventListener('afterprint', after);
  return () => {
    target.removeEventListener('beforeprint', before);
    target.removeEventListener('afterprint', after);
    after();
  };
}
