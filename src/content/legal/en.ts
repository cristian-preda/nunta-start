import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_ADDRESS, LEGAL_OPERATOR_NAME } from './contact';
import type { LegalContent } from './types';

/** Draft texts; the legal review has not happened yet. */
export const legalEn: LegalContent = {
  privacy: [
    {
      id: 'operator',
      heading: 'Who is responsible for the data',
      paragraphs: [
        'Nunta Start is currently an invite-only beta used by the app’s owner and friends. The data controller is:',
        `${LEGAL_OPERATOR_NAME}, ${LEGAL_OPERATOR_ADDRESS}. Contact: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: 'date-colectate',
      heading: 'What data we collect',
      paragraphs: [
        'Account: your email address and display name, received from Google (when you sign in with Google) or from you (when you use the emailed link).',
        'Wedding plan: the partners’ names, the date, the city or venue, tasks, budget lines, the day-of timeline, custom pages and the guest list you enter.',
        'Guests: name, age group, side (bride or groom), RSVP answer and a menu preference (classic, vegetarian or vegan). We do not collect allergies or other health data. Guests can also add a free-text note through the RSVP link: please do not write medical information in it.',
        'Technical data: application errors and performance measurements, with no user identity and with tokens stripped from addresses (see “Who processes the data”).',
        'The public RSVP page needs no account and is protected by Cloudflare Turnstile and rate limits.',
      ],
    },
    {
      id: 'de-ce',
      heading: 'Why we use it',
      paragraphs: [
        'We use the data only to provide the service: to sign you in, store and show your wedding plan, and send the emails it needs (the sign-in code, plan invitations).',
        'We use technical data to fix errors and keep the app fast. We do not sell data and do not use it for advertising.',
      ],
    },
    {
      id: 'cine-vede',
      heading: 'Who can see the data',
      paragraphs: [
        'A wedding plan can only be seen by that wedding’s members: the people you invite, or who invited you, to the plan. Other users have no access.',
        'Access is by invitation: only email addresses on the allow list can create an account.',
      ],
    },
    {
      id: 'acces-operator',
      heading: 'Operator access to data',
      paragraphs: [
        'The data is not encrypted in a way that makes it technically unreadable to the operator; the protection is operational. We commit that the operator does not browse user data and accesses it only when necessary (for example to fix a fault or at your request), with least privilege.',
        'Use of privileged access (the service key) is logged and reviewed. We collect as little personal data as possible and do not ask for sensitive data.',
        'These rules are being formalised in an internal operational document; this text will be aligned with it.',
      ],
    },
    {
      id: 'procesatori',
      heading: 'Who processes the data',
      paragraphs: [
        'Supabase: database and authentication, in an EU region.',
        'Cloudflare: app hosting (Pages), DNS and Turnstile bot protection on the public RSVP page.',
        'Resend: transactional email (the sign-in code, invitations).',
        'Grafana Cloud (Faro): frontend error and performance monitoring. We do not send user identity.',
        'Google: sign-in with your Google account, if you choose that method.',
      ],
    },
    {
      id: 'pastrare',
      heading: 'How long we keep data',
      paragraphs: [
        'Plan data is kept while your account exists. The activity log is kept for 180 days.',
        'When you delete your account in Settings, a wedding of which you are the only owner is hidden immediately and permanently deleted after 30 days.',
        'Backups: we plan encrypted daily copies stored at Cloudflare R2, with rotation. At the date of this draft that job is not yet active.',
      ],
    },
    {
      id: 'drepturi',
      heading: 'Your rights',
      paragraphs: [
        'Under the GDPR you have the right to access, export (portability), rectify, delete and object to processing. You may also lodge a complaint with the Romanian data protection authority (ANSPDCP).',
        'From Settings → Data and space you can download your data (JSON) and delete your account.',
        `For any other request, write to ${LEGAL_CONTACT_EMAIL}. We reply within 30 days.`,
      ],
    },
    {
      id: 'cookies',
      heading: 'Cookies and local storage',
      paragraphs: [
        'We only use functional browser storage: theme (light or dark), language and the sign-in session. We use no tracking or advertising cookies, so there is no consent banner.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Questions about personal data: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
  terms: [
    {
      id: 'serviciul',
      heading: 'The service',
      paragraphs: [
        'Nunta Start is a web app for planning a wedding: tasks, budget, guests, the day-of timeline and custom pages. It is an invite-only beta. By using it you agree to these terms.',
        `Provider: ${LEGAL_OPERATOR_NAME}.`,
      ],
    },
    {
      id: 'conturi',
      heading: 'Accounts',
      paragraphs: [
        'You sign in with Google or with an emailed link, if your address is on the allow list. You are responsible for access to your account and email.',
        'You can invite other people to the wedding plan. They will see the plan’s data, so only invite people you trust.',
      ],
    },
    {
      id: 'utilizare',
      heading: 'Acceptable use',
      paragraphs: [
        'Do not use the service for illegal activity, try to access other users’ data, upload harmful content, or deliberately overload the service or its protections.',
      ],
    },
    {
      id: 'continut',
      heading: 'Your content',
      paragraphs: [
        'The data you enter remains yours. You give us the right to store it and show it to the plan’s members, strictly to provide the service.',
        'You can export or delete your data at any time from Settings.',
      ],
    },
    {
      id: 'disponibilitate',
      heading: 'Availability',
      paragraphs: [
        'The service is free, in beta and offered as a hobby project, “as is”. We do not guarantee continuous availability, freedom from errors or retention of data. We recommend exporting a copy of your plan regularly.',
      ],
    },
    {
      id: 'raspundere',
      heading: 'Liability',
      paragraphs: [
        'To the extent permitted by law, we are not liable for indirect losses or for decisions made from information in the app (for example budgets or deadlines). Nothing here limits liability that cannot be limited by law.',
      ],
    },
    {
      id: 'modificari',
      heading: 'Changes',
      paragraphs: [
        'We may update these terms. The last-updated date is shown at the top; for important changes we will notify you in the app or by email.',
      ],
    },
    {
      id: 'lege',
      heading: 'Governing law',
      paragraphs: [
        'These terms are governed by Romanian law. Disputes are resolved by the competent courts of Romania.',
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [`Questions about these terms: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
