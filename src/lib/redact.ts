// Rutele din browser (`/invite/…`, `/r/…`, `/t/…`) și adresele funcțiilor care primesc tokenul în cale
// (`…/functions/v1/rsvp/…`, `…/functions/v1/timeline-share/…`): Faro le înregistrează și pe acestea (resource timing).
const PATH_TOKEN = /(\/(?:invite|r|t|rsvp|timeline-share)\/)[^/?#"\\\s]+/g;
const AUTH_PARAM = /([?&#](?:code|access_token|refresh_token|provider_token|token_hash|token)=)[^&#"\\\s]+/g;

/** Scoate din text tokenul unei invitații, al unui link RSVP sau al programului distribuit și parametrii de autentificare din adrese, ca să nu ajungă la terți (telemetrie). */
export function redactSecrets(text: string): string {
  return text.replace(PATH_TOKEN, '$1[redacted]').replace(AUTH_PARAM, '$1[redacted]');
}

/** Copie a unui element de telemetrie cu adresele curățate de secrete. */
export function redactDeep<T>(value: T): T {
  return JSON.parse(redactSecrets(JSON.stringify(value)));
}
