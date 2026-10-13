import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_ADDRESS, LEGAL_OPERATOR_NAME } from './contact';
import type { LegalContent } from './types';

/** Proiecte de text; revizuirea juridică nu a avut loc încă. */
export const legalRo: LegalContent = {
  privacy: [
    {
      id: 'operator',
      heading: 'Cine răspunde de date',
      paragraphs: [
        'Nunta Start este în prezent o versiune beta, pe invitație, folosită de proprietarul aplicației și de prieteni. Operatorul datelor este:',
        `${LEGAL_OPERATOR_NAME}, ${LEGAL_OPERATOR_ADDRESS}. Contact: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: 'date-colectate',
      heading: 'Ce date colectăm',
      paragraphs: [
        'Contul: adresa de email și numele afișat, primite de la Google (când vă conectați cu Google) sau de la dumneavoastră (când folosiți linkul trimis pe email).',
        'Planul nunții: numele celor doi parteneri, data, orașul sau locația, sarcinile, liniile de buget, programul zilei, paginile personalizate și lista de invitați pe care o introduceți.',
        'Invitați: nume, grupa de vârstă, partea (mireasă sau mire), răspunsul de participare și o preferință de meniu (clasic, vegetarian sau vegan). Nu colectăm alergii sau alte date despre sănătate. Invitații pot adăuga și o notă liberă prin linkul de confirmare: vă rugăm să nu scrieți date medicale în ea.',
        'Date tehnice: erori și măsurători de performanță ale aplicației, fără identitate de utilizator, cu adresele curățate de tokenuri (vezi „Cine prelucrează datele”).',
        'Pagina publică de confirmare (RSVP) nu cere cont și este protejată cu Cloudflare Turnstile și limite de cereri.',
      ],
    },
    {
      id: 'de-ce',
      heading: 'De ce le folosim',
      paragraphs: [
        'Folosim datele doar ca să furnizăm serviciul: să vă conectăm, să salvăm și să afișăm planul nunții și să vă trimitem emailurile necesare (codul de conectare, invitații în plan).',
        'Folosim datele tehnice pentru a remedia erori și a menține aplicația rapidă. Nu vindem datele și nu le folosim pentru publicitate.',
      ],
    },
    {
      id: 'cine-vede',
      heading: 'Cine poate vedea datele',
      paragraphs: [
        'Planul unei nunți poate fi văzut doar de membrii acelei nunți, adică de persoanele pe care le invitați sau care v-au invitat în plan. Alți utilizatori nu au acces.',
        'Accesul este pe invitație: doar adresele de email aflate pe lista de acces pot crea cont.',
      ],
    },
    {
      id: 'acces-operator',
      heading: 'Accesul operatorului la date',
      paragraphs: [
        'Datele nu sunt criptate astfel încât operatorul să nu le poată citi tehnic; protecția este una operațională. Ne angajăm ca operatorul să nu răsfoiască datele utilizatorilor și să le acceseze doar când este necesar (de exemplu pentru a remedia o defecțiune sau la cererea dumneavoastră), cu drepturi minime.',
        'Folosirea accesului privilegiat (cheia de serviciu) este înregistrată și verificată. Colectăm cât mai puține date personale și nu cerem date sensibile.',
        'Aceste reguli sunt în curs de formalizare într-un document operațional intern; acest text va fi aliniat cu el.',
      ],
    },
    {
      id: 'procesatori',
      heading: 'Cine prelucrează datele',
      paragraphs: [
        'Supabase: baza de date și autentificarea, într-o regiune din UE.',
        'Cloudflare: găzduirea aplicației (Pages), DNS și protecția anti-boți Turnstile pe pagina publică de confirmare.',
        'Resend: trimiterea emailurilor tranzacționale (codul de conectare, invitații).',
        'Grafana Cloud (Faro): monitorizarea erorilor și a performanței din aplicație. Nu trimitem identitatea utilizatorului.',
        'Google: conectarea cu contul Google, dacă alegeți această metodă.',
      ],
    },
    {
      id: 'pastrare',
      heading: 'Cât timp păstrăm datele',
      paragraphs: [
        'Datele planului se păstrează cât timp contul există. Jurnalul de activitate se păstrează 180 de zile.',
        'Când ștergeți contul din Setări, o nuntă al cărei unic proprietar sunteți este ascunsă imediat și ștearsă definitiv după 30 de zile.',
        'Copii de siguranță: planificăm copii zilnice criptate, stocate la Cloudflare R2, cu rotație. La data acestui proiect, această procedură nu este încă activă.',
      ],
    },
    {
      id: 'drepturi',
      heading: 'Drepturile dumneavoastră',
      paragraphs: [
        'Conform GDPR, aveți dreptul de acces, de export (portabilitate), de rectificare, de ștergere și de opoziție față de prelucrare. Aveți și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).',
        'Din Setări → Datele și spațiul puteți descărca datele (JSON) și vă puteți șterge contul.',
        `Pentru orice altă cerere, scrieți-ne la ${LEGAL_CONTACT_EMAIL}. Răspundem în cel mult 30 de zile.`,
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookie-uri și stocare locală',
      paragraphs: [
        'Folosim doar stocare funcțională în browser: tema (luminoasă sau întunecată), limba și sesiunea de conectare. Nu folosim cookie-uri de urmărire sau de publicitate, așa că nu afișăm un banner de consimțământ.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Întrebări despre datele personale: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
  terms: [
    {
      id: 'serviciul',
      heading: 'Serviciul',
      paragraphs: [
        'Nunta Start este o aplicație web pentru planificarea unei nunți: sarcini, buget, invitați, programul zilei și pagini personalizate. Este o versiune beta, doar pe invitație. Folosind-o, sunteți de acord cu acești termeni.',
        `Furnizor: ${LEGAL_OPERATOR_NAME}.`,
      ],
    },
    {
      id: 'conturi',
      heading: 'Conturi',
      paragraphs: [
        'Vă conectați cu Google sau cu un link trimis pe email, dacă adresa dumneavoastră este pe lista de acces. Sunteți responsabil pentru accesul la contul și la emailul dumneavoastră.',
        'Puteți invita alte persoane în planul nunții. Ele vor vedea datele planului, așa că invitați doar persoane de încredere.',
      ],
    },
    {
      id: 'utilizare',
      heading: 'Utilizare acceptabilă',
      paragraphs: [
        'Nu folosiți serviciul pentru activități ilegale, nu încercați să accesați datele altor utilizatori, nu încărcați conținut dăunător și nu supraîncărcați intenționat serviciul sau măsurile lui de protecție.',
      ],
    },
    {
      id: 'continut',
      heading: 'Conținutul dumneavoastră',
      paragraphs: [
        'Datele pe care le introduceți rămân ale dumneavoastră. Ne dați dreptul de a le stoca și afișa membrilor planului, strict ca să furnizăm serviciul.',
        'Vă puteți exporta sau șterge datele oricând din Setări.',
      ],
    },
    {
      id: 'disponibilitate',
      heading: 'Disponibilitate',
      paragraphs: [
        'Serviciul este gratuit, în versiune beta și oferit ca proiect de pasiune, „așa cum este”. Nu garantăm disponibilitate continuă, absența erorilor sau păstrarea datelor. Vă recomandăm să exportați periodic o copie a planului.',
      ],
    },
    {
      id: 'raspundere',
      heading: 'Răspundere',
      paragraphs: [
        'În măsura permisă de lege, nu răspundem pentru pierderi indirecte sau pentru decizii luate pe baza informațiilor din aplicație (de exemplu bugete sau termene). Nimic din acest text nu limitează răspunderea care nu poate fi limitată prin lege.',
      ],
    },
    {
      id: 'modificari',
      heading: 'Modificări',
      paragraphs: [
        'Putem actualiza acești termeni. Data ultimei actualizări apare în partea de sus; la modificări importante vă anunțăm în aplicație sau pe email.',
      ],
    },
    {
      id: 'lege',
      heading: 'Legea aplicabilă',
      paragraphs: [
        'Acești termeni sunt guvernați de legea română. Litigiile se soluționează de instanțele competente din România.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Întrebări despre acești termeni: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
