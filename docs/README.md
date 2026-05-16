# ASAP Documentation

Welcome. This folder holds the technical documentation for the ASAP project. End-user product docs live on [asap.cool/docs](https://asap.cool) and are not part of this repo.

## Pick your path

| If you are… | Start here |
| --- | --- |
| **Self-hosting** ASAP on your own infrastructure | [`self-hosting/installation.md`](./self-hosting/installation.md) |
| **Contributing** to the codebase | [`development/architecture.md`](./development/architecture.md), then [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| **Integrating** with the API | [`development/api.md`](./development/api.md) |
| Looking into a **specific feature design** | [`features/`](./features/) |
| Reviewing **architecture decisions** | [`development/decisions/`](./development/decisions/) |

## Layout

```
docs/
├── self-hosting/        Operators: install, configure, upgrade
├── development/         Contributors: architecture, API, testing, ADRs
└── features/            Per-feature design docs (AI, extensions, PWA, …)
```

The repository root holds the public-facing files: [`README.md`](../README.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), [`SECURITY.md`](../SECURITY.md), [`CHANGELOG.md`](../CHANGELOG.md), [`LICENSE`](../LICENSE).

## Status

ASAP is pre-1.0. Some documents are inherited from earlier internal work and are progressively being rewritten in English with the current architecture. Open an issue if something is unclear or out of date.

## Out of scope

Roadmap, business strategy, and internal implementation plans are tracked outside of this repo. Public-facing roadmap items live in [GitHub Issues](https://github.com/Sycatle/asap-website-builder/issues) and [Projects](https://github.com/Sycatle/asap-website-builder/projects).
