<div align="center">

# ASAP

**Ship your professional website in minutes — portfolio, business, vitrine.**

[![Status](https://img.shields.io/badge/status-pre--1.0-orange?style=flat-square)](https://github.com/Sycatle/asap-website-builder/releases)
[![License: BSL 1.1](https://img.shields.io/badge/license-BSL%201.1-blue?style=flat-square)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.87+-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Astro](https://img.shields.io/badge/astro-4+-purple?style=flat-square&logo=astro)](https://astro.build)

[Website](https://asap.cool) · [Documentation](docs/) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

</div>

---

## What it is

ASAP is an open, self-hostable website builder for one-page professional sites — **portfolios, business vitrines, landing pages**. Pick a preset, swap the sections, publish in minutes.

- **Modular sections.** 14+ section types (hero, projects, services, pricing, contact, gallery, FAQ…) you can mix, match, and reorder.
- **Presets that look done.** Polished templates for portfolios, freelancers, and small businesses — not blank canvases.
- **Self-hostable.** Bring your own server. No vendor lock-in. BSL 1.1 today, Apache 2.0 in 2030.
- **Optional AI assist.** A built-in AI panel proposes content and edits — you review before anything ships.
- **GitHub import (for devs).** Hydrate a portfolio from your public repos in one click.

## Why ASAP

| | ASAP | Carrd / Linktree | Webflow / Framer | Self-hosted WordPress |
| --- | --- | --- | --- | --- |
| One-page presets that look done | yes | partial | yes | depends on theme |
| Self-host the whole stack | yes | no | no | yes |
| Modern stack (Rust + Astro) | yes | no | no | no |
| AI panel built in | yes | no | partial | plugin |
| Source available | yes | no | no | yes |
| Free public-tier plan | yes | yes | partial | yes |

## Quickstart

Requirements: Rust 1.87+, Node 20+, pnpm 9.15+, Docker, Make.

```bash
git clone https://github.com/Sycatle/asap-website-builder.git
cd asap-website-builder
cp infra/.env.prod.example infra/.env.prod   # then edit values
make dev
```

Services:

- Dashboard: http://localhost:4321
- API: http://localhost:3000
- Public sites: `http://{slug}.localhost:4321`

Full setup instructions: [`docs/self-hosting/installation.md`](docs/self-hosting/installation.md).

## Project status

ASAP is **pre-1.0**. The core API, multi-tenant model, Stripe billing, AI panel, and PWA shell are functional. The visual studio editor and several extensions are under active development. Expect breaking changes between minor versions until 1.0.

Active focus areas:

- Visual studio editor (drag-and-drop section authoring)
- Analytics dashboard
- Public template gallery

## Stack

- **Backend.** Rust 1.87, Axum, SQLx, Tokio
- **Frontend.** Astro, React 19, TypeScript 5, TailwindCSS, shadcn/ui
- **Data.** PostgreSQL 15, Redis 7
- **Payments.** Stripe
- **Infrastructure.** Docker Compose, pnpm workspaces

See [`docs/development/architecture.md`](docs/development/architecture.md) for the full breakdown.

## Documentation

- [Self-hosting](docs/self-hosting/) — install, configure, upgrade
- [Development](docs/development/) — architecture, API, testing, ADRs
- [Features](docs/features/) — per-feature design docs (AI, extensions, PWA…)
- [Changelog](CHANGELOG.md)

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first.

- Bugs and feature requests: [open an issue](https://github.com/Sycatle/asap-website-builder/issues/new/choose)
- Questions and ideas: [GitHub Discussions](https://github.com/Sycatle/asap-website-builder/discussions)
- Security: see [`SECURITY.md`](SECURITY.md) — please do **not** open a public issue

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Source code is licensed under the [Business Source License 1.1](LICENSE).

- You may use, copy, modify, and redistribute the code for non-production and most production use.
- You may **not** offer ASAP itself as a competing hosted service.
- On **2030-05-16** the license converts automatically to **Apache License 2.0**.

If you need a commercial license that lifts the competing-service restriction earlier, get in touch at hello@asap.cool.

## Acknowledgements

Built on top of [Astro](https://astro.build), [Axum](https://github.com/tokio-rs/axum), [React](https://react.dev), [shadcn/ui](https://ui.shadcn.com), and many other open-source projects. Thank you.
