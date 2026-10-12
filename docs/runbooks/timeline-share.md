# Linkul public al programului zilei (NS-122)

Din **Programul zilei → Distribuie**, cine poate edita (owner, partner, planner, helper) creează un link `/t/<token>`. Oricine îl are vede programul în citire, fără cont: numele nunții, data, orașul și fiecare eveniment cu ora, durata, locul și **notele**. Pagina se tipărește curat (butonul „Tipărește" sau Ctrl+P), mereu cu tema luminoasă.

## Cum e făcut

- Tokenul are 160 de biți; în baza de date stă doar sha256 (`timeline_share_tokens`, fără acces din client). Textul clar se vede o singură dată, în dialog.
- „Creează link" **înlocuiește** linkul trimis înainte. „Oprește distribuirea" (`revoke_timeline_share_token`) îl oprește fără să facă altul.
- Pagina citește prin Edge Function-ul `timeline-share` (cheia `service_role`), care apelează `get_shared_timeline(token)`. Funcția SQL nu poate fi apelată de `anon` sau `authenticated`, deci un token se poate încerca doar prin Edge Function. Un token care nu arată a token (nu are 40 de caractere hex) primește 404 fără interogare.
- Răspunsurile au `Cache-Control: no-store`, ca un link oprit să nu mai poată fi citit din cache. Pagina are `noindex` (antet pe `/t/*` și meta robots). Adresa `/t/…` e ascunsă din telemetrie (`redactSecrets`).
- O nuntă ștearsă nu se mai servește, chiar cu token valid.

## Deploy (manual, o dată per proiect cloud)

Pipeline-ul `deploy.yml` aplică doar migrațiile; funcția se publică separat. Nu are secrete proprii (`SUPABASE_URL` și `SUPABASE_SERVICE_ROLE_KEY` le dă platforma).

```bash
npx supabase link --project-ref <ref>
npx supabase functions deploy timeline-share
```

Fără funcția publicată, pagina arată „Linkul nu mai funcționează" sau o eroare de rețea, iar dialogul de distribuire creează linkuri care nu se pot deschide încă.

## Verificare pe staging

1. Programul zilei → Distribuie → Creează link; copiați linkul.
2. Deschideți-l într-o fereastră privată (fără cont): vedeți programul, fără meniul aplicației. Ctrl+P: fără antet și fără buton, text închis pe alb, chiar dacă browserul e pe tema întunecată.
3. Creați un link nou: cel vechi dă „Linkul nu mai funcționează", cel nou merge.
4. Oprește distribuirea: și cel nou dă „Linkul nu mai funcționează".
5. `curl -i https://<ref>.supabase.co/functions/v1/timeline-share/<token>` trebuie să arate `cache-control: no-store`.

## Ce nu face

- Nu are limită de cereri pe IP: tokenul e prea lung ca să fie ghicit, iar funcția doar citește. Dacă apare abuz, se adaugă ca la `rsvp` (NS-081).
- Notele sunt vizibile oricui are linkul. Nu puneți în note ce nu vreți să vadă furnizorii (sume, contracte).
