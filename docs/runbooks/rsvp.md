# Linkul RSVP al familiei (NS-081)

Din **Invitați**, cine poate edita (owner, partner, planner, helper) copiază linkul `/r/<token>` al unei familii (NS-080). Oricine îl are, fără cont, vede membrii familiei și răspunsurile date, apoi poate răspunde: vine / nu vine, meniul (clasic, vegetarian, vegan) și o notă. **Nu se colectează alergii.**

## Cum e făcut

- Pagina vorbește cu Edge Function-ul `rsvp` (cheia `service_role`), care apelează trei RPC-uri accesibile doar rolului `service_role`: `get_rsvp_household(token)`, `submit_rsvp(token, answers, note)` și `rsvp_rate_limit_hit(key, limit, window)`. Un token se poate încerca doar prin funcție.
- Contractul: `GET rsvp/<token>` dă 200 cu familia sau 404; `POST rsvp/<token>` cu `{answers: [{guestId, attending: 'yes'|'no', diet}], note, turnstileToken?}` dă 204, 400 (răspuns invalid sau invitat din altă familie), 403 (verificarea anti-bot), 404 sau 429.
- Un token care nu arată a token (nu are 40 de caractere hex) primește 404 fără interogare. „Creează link nou" rotește tokenul (cel vechi dă 404). O nuntă ștearsă nu se mai servește.
- Răspunsul ajunge pe `guests.attending` / `guests.diet` (lista de invitați se vede live) și nota pe `households.rsvp_note` (separat de `households.notes`, notele interne ale cuplului). `households.rsvp_answered_at` ține ultima trimitere.
- Limită pe IP: 60 de cereri la 10 minute (GET și POST împreună). IP-ul vine din `cf-connecting-ip`, altfel din **ultima** valoare `x-forwarded-for` (cea adăugată de proxy; valorile dinaintea ei le poate falsifica clientul). IP-ul se păstrează doar ca hash SHA-256, în `private.rsvp_rate_limits`; rândurile mai vechi de o zi se șterg la următoarea cerere. Când limita e depășită: 429.
- Turnstile: dacă secretul `TURNSTILE_SECRET_KEY` e setat, orice POST trebuie să aibă un `turnstileToken` valid (verificat la Cloudflare, `siteverify`); altfel 403. **Dacă secretul nu e setat, verificarea se sare** (dezvoltare locală și CI). Crearea widgetului și a cheilor e NS-023; până atunci pagina nu trimite tokenul, deci în producție nu setați secretul înainte să existe widgetul, altfel nimeni nu mai poate răspunde.
- Răspunsurile au `Cache-Control: no-store` și `X-Robots-Tag: noindex`.

## Deploy (manual, o dată per proiect cloud)

Pipeline-ul `deploy.yml` aplică doar migrațiile (`20261013100000_rsvp_function.sql`); funcția se publică separat.

```bash
npx supabase link --project-ref <ref>
npx supabase functions deploy rsvp
```

### Turnstile (NS-023)

Ordinea contează: **întâi** site key-ul în frontend, **apoi** secretul pe funcție. Invers, funcția cere un token pe care pagina încă nu-l trimite și nimeni nu mai poate răspunde.

1. Cloudflare → Turnstile → Add site; domenii: `theromans.thedevopsguy.ro`, domeniul Pages de staging, `localhost`; mod Managed.
2. Pages → Settings → Environment variables: `VITE_TURNSTILE_SITE_KEY=<site key>` (production și preview), apoi redeploy. Pagina `/r/<token>` arată widgetul și trimite tokenul.
3. Abia apoi: `npx supabase secrets set TURNSTILE_SECRET_KEY=<secret key> --project-ref <ref>` (secretul nu se pune niciodată în repo sau în Pages).
4. Verificare: un POST fără `turnstileToken` dă 403; din pagină, răspunsul merge. Fără `VITE_TURNSTILE_SITE_KEY` widgetul nu apare și cererea pleacă fără token (local, CI).

După ce e activ pe producție, înlocuiți în `src/content/legal/{ro,en}.ts` formularea „nu este încă activă".

`SUPABASE_URL` și `SUPABASE_SERVICE_ROLE_KEY` le dă platforma. Funcția păstrează verificarea implicită a JWT-ului: aplicația trimite cheia anon (publică), iar o cerere fără antete primește 401 de la platformă.

Fără funcția publicată, pagina arată eroarea „nu e configurat" / rețea.

## Verificare pe staging

1. Invitați → o familie cu 2 invitați → „Copiază linkul".
2. Într-o fereastră privată deschideți linkul: vedeți cei 2 invitați. Răspundeți (unul vine, vegetarian; unul nu vine) și lăsați o notă. Pagina confirmă.
3. În aplicație, lista de invitați arată „vine / nu vine" și meniul, fără refresh.
4. Cu cheia anon și un token valid:
   `curl -i -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" https://<ref>.supabase.co/functions/v1/rsvp/<token>` → 200 și `cache-control: no-store`.
   Cu 40 de caractere hex inventate → 404.
5. Rotiți linkul: cel vechi dă 404, cel nou merge.
6. Limita: peste 60 de cereri în 10 minute de la aceeași adresă primesc 429.
7. Cu `TURNSTILE_SECRET_KEY` setat: un POST fără `turnstileToken` (sau cu unul inventat) dă 403.

## Local

Fără `TURNSTILE_SECRET_KEY` verificarea se sare. `npx supabase functions serve rsvp`; testele handler-ului rulează cu Vitest (`supabase/functions/rsvp/handler.test.ts`).

## Ce nu face încă

- CI nu servește funcția `rsvp` (testul e2e al fluxului anonim e NS-084).
- Widgetul Turnstile apare doar când `VITE_TURNSTILE_SITE_KEY` e setat; fără cheile din Cloudflare nu e activ nicăieri.
- Limita pe IP e per proiect și simplă (fereastră fixă): mai mulți invitați în aceeași rețea (aceeași adresă la nuntă, de exemplu) împart același buget de 60 de cereri.
