interface ImportMetaEnv {
  readonly VITE_FARO_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Cheia publică Cloudflare Turnstile pentru pagina RSVP; fără ea widgetul nu apare. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** 'true' arată butonul Google în ecranul de conectare (implicit ascuns: doar codul pe email). */
  readonly VITE_AUTH_GOOGLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
