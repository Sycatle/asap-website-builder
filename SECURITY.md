# Security Policy

## Supported Versions

ASAP is pre-1.0. Only the `main` branch and the latest tagged release receive security fixes.

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |
| Latest tag | Yes    |
| Older tags | No     |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately via one of the following channels:

- GitHub Security Advisories: https://github.com/Sycatle/asap-website-builder/security/advisories/new
- Email: security@asap.cool

Please include:

- A clear description of the issue and its impact.
- Steps to reproduce, ideally with a minimal proof-of-concept.
- Affected versions, commits, or deployments.
- Any suggested remediation.

You will receive an acknowledgement within 72 hours. A coordinated disclosure timeline will be agreed before any public communication.

## Scope

In scope:

- Authentication and session handling (`core/api`, `core/shared/auth`).
- Multi-tenant isolation (account boundaries, RLS).
- Billing flows (`core/payments`, Stripe webhooks).
- AI orchestrator (`core/ai`), including rate limiting and cost-control bypasses.
- File upload, storage, and rendering paths.
- WebSocket and Server-Sent Events endpoints.

Out of scope:

- Issues requiring physical access, a compromised browser, or social engineering.
- Denial of service on the public demo deployment.
- Reports about missing security headers without a concrete exploit path.
- Third-party dependencies — please report upstream instead and copy us if relevant.

## Hall of Fame

Researchers who follow this policy and report a confirmed issue will be credited in the release notes unless they request to remain anonymous.
