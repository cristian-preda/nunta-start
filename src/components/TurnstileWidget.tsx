import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Încarcă scriptul Cloudflare o singură dată; la eroare, următoarea montare încearcă din nou. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    script.onerror = () => reject(new Error('turnstile script failed'));
    document.head.append(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Tokenul valid, sau `''` când a expirat sau verificarea a eșuat. */
  onToken: (token: string) => void;
  /** Se apelează dacă scriptul sau verificarea nu pot rula. */
  onError: () => void;
  /** Un token se poate folosi o singură dată: la schimbarea valorii, widgetul cere unul nou. */
  resetKey: number;
}

/** Widgetul Cloudflare Turnstile (NS-023). Se montează doar când există `VITE_TURNSTILE_SITE_KEY`. */
export function TurnstileWidget({ siteKey, onToken, onError, resetKey }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onError });
  callbacks.current = { onToken, onError };

  useEffect(() => {
    let cancelled = false;
    loadTurnstile().then(
      (turnstile) => {
        if (cancelled || !container.current) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token) => callbacks.current.onToken(token),
          'expired-callback': () => callbacks.current.onToken(''),
          'error-callback': () => {
            callbacks.current.onToken('');
            callbacks.current.onError();
          },
        });
      },
      () => {
        if (!cancelled) callbacks.current.onError();
      },
    );
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resetKey` doar declanșează resetarea.
  useEffect(() => {
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  return <div ref={container} data-turnstile-slot="" className="flex min-h-[65px] justify-center" />;
}
