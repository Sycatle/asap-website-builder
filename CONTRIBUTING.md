# Contributing to ASAP

Thanks for your interest in ASAP. This guide covers how to get a working development environment, how we expect changes to be proposed, and where to ask for help.

## Code of Conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Where to go

- **Bug reports** and **feature requests** → [GitHub Issues](https://github.com/Sycatle/asap-website-builder/issues).
- **Questions, ideas, discussions** → [GitHub Discussions](https://github.com/Sycatle/asap-website-builder/discussions).
- **Security vulnerabilities** → see [`SECURITY.md`](SECURITY.md). Do **not** open a public issue.

## Development setup

Requirements: Rust 1.87+, Node 20+, pnpm 9.15+, Docker, Make.

```bash
git clone https://github.com/Sycatle/asap-website-builder.git
cd asap-website-builder
cp infra/.env.prod.example infra/.env.prod   # edit values
make dev
```

Useful commands:

```bash
make dev              # full stack with hot reload
make down             # stop services
make logs             # tail logs
make test             # run the test suite
pnpm -r lint          # lint TypeScript packages
cargo fmt --all       # format Rust
cargo clippy --all    # lint Rust
```

Full installation notes: [`docs/self-hosting/installation.md`](docs/self-hosting/installation.md).
Architecture overview: [`docs/development/architecture.md`](docs/development/architecture.md).

## Branching and pull requests

1. Fork the repo and create a topic branch off `main` (`feat/short-name`, `fix/short-name`, `docs/short-name`).
2. Keep changes focused. Prefer multiple small PRs over one large one.
3. Push and open a pull request against `main`. Fill in the PR template.
4. CI must be green. Reviewers will be assigned by the maintainers.
5. PRs are merged with **squash and merge**; the final commit message follows Conventional Commits.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add /websites/:id/duplicate endpoint
fix(web): correct Stripe redirect in checkout flow
docs(self-hosting): clarify Postgres backup procedure
chore(deps): bump axum to 0.7.5
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Sign-off (DCO)

We require the [Developer Certificate of Origin](https://developercertificate.org/) on every commit. Add `-s` to your commits:

```bash
git commit -s -m "feat(api): add ..."
```

This appends a `Signed-off-by: Your Name <you@example.com>` trailer certifying that you have the right to contribute the change under this project's license.

## Code style

- **Rust.** `cargo fmt --all` and `cargo clippy --all-targets -- -D warnings`. Idiomatic Rust, no `unsafe` without justification in a code comment.
- **TypeScript.** Project-wide ESLint and Prettier configs. Prefer named exports, no default exports outside route files.
- **React.** Functional components only. Hooks at the top. Keep components under ~200 lines.
- **SQL.** Migrations are append-only and live in `infra/migrations/`. Never edit a merged migration.

## Tests

- Add or update tests when changing behavior in `core/`, `apps/api/`, or `apps/worker/`.
- Run `make test` before requesting review.
- Integration tests must use a real Postgres instance (the test compose file sets one up).

See [`docs/development/testing.md`](docs/development/testing.md) for the full testing guide.

## Breaking changes and ADRs

Architectural or breaking changes require a short ADR in [`docs/development/decisions/`](docs/development/decisions/). Open the ADR PR before or alongside the implementation PR.

## Licensing of contributions

By submitting a contribution you agree that your contribution will be licensed under the project's [Business Source License 1.1](LICENSE) and the future Apache 2.0 conversion as described in that file.

## Recognition

All non-trivial contributions are credited in the release notes. Thank you for making ASAP better.
