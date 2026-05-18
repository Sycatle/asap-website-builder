# Privacy Policy

> **Draft.** These templates are not legal advice. Have a qualified lawyer
> review and adapt them to your jurisdiction (GDPR, CCPA, etc.) before going
> live with paying users.

_Last updated: <!-- TODO: set date -->_

ASAP ("we", "the service") is operated by **<!-- TODO: legal entity -->**
("Operator"), reachable at **<!-- TODO: contact address -->**.

## 1. Data we collect

We collect only what is required to operate the service:

| Category | Examples | Purpose | Retention |
|---|---|---|---|
| Account | Email, hashed password, plan, locale | Authentication, billing | Until account deletion |
| Content | Websites, files, page elements, design tokens | Core product | Until deletion by the user |
| Operational | IP address, user agent, request logs | Security, abuse prevention | 30 days |
| Billing | Stripe customer id, last 4 of card, invoices | Payment processing | 10 years (legal obligation) |
| Communications | Support tickets, transactional emails | Support, account notifications | 3 years |

We do **not** sell personal data, and we do not run third-party advertising
trackers on the studio. The static sites you publish are under your control;
you are responsible for what you embed on them.

## 2. Sub-processors

| Provider | Purpose | Region |
|---|---|---|
| Stripe | Payment processing | EU + US |
| Resend | Transactional email | EU |
| <!-- TODO: hosting --> | Application hosting | <!-- TODO: region --> |
| <!-- TODO: object storage --> | File storage + backups | <!-- TODO: region --> |

## 3. Your rights (GDPR Article 15-21)

- **Access & portability** — `GET /api/account/export` (also available in
  Settings → Account → "Export my data") returns every record we hold about
  your account as JSON.
- **Erasure** — `DELETE /api/accounts/{id}` (also "Delete my account" in
  Settings) permanently removes your account and content within 30 days, with
  the exception of billing records we are legally required to retain.
- **Rectification** — edit your profile in Settings, or contact us.
- **Restriction & objection** — write to **<!-- TODO: privacy email -->**.

We answer within 30 days. If you are unsatisfied with our response you can
lodge a complaint with the supervisory authority in your country (in France,
the CNIL).

## 4. Cookies & local storage

We use first-party storage only:

- An authentication cookie / token (necessary for login).
- A CSRF token (necessary).
- A locale preference (functional).

No analytics or marketing cookies are set by default. If a publisher embeds
analytics on their published site, those cookies are governed by the
publisher's own policy.

## 5. Security

- Passwords are stored hashed with bcrypt (cost 13).
- JWT access tokens are short-lived; refresh tokens rotate on every use and
  revoke the whole family on reuse detection.
- Backups are encrypted client-side before leaving our cluster.
- Production deployments require HTTPS end-to-end.

We disclose security incidents affecting personal data without undue delay,
and within 72 hours where GDPR Article 33 applies.

## 6. International transfers

When we transfer data outside the EEA, we rely on Standard Contractual
Clauses with our sub-processors.

## 7. Children

ASAP is not directed at children under 16 and we do not knowingly collect
data from them.

## 8. Changes

We will announce material changes by email at least 30 days before they take
effect.

## 9. Contact

**<!-- TODO: privacy email -->** — postal address on the Imprint page.
