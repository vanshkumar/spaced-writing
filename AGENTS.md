# Repository Guidelines

These guidelines keep contributions to spaced-writing (Obsidian plugin: “Inklings Focus”) consistent and easy to review. The repo is light today; use this structure and conventions when adding code.

## Project Structure & Module Organization

```
manifest.json    // Obsidian plugin manifest
versions.json    // Obsidian compatibility map
styles.css       // plugin styles (optional)
src/             // TypeScript source (entry: main.ts)
  core/          // deck building, snooze, parsing
  ui/            // Focus view components
  obsidian/      // adapters to Vault API
tests/           // unit/integration tests mirroring src
assets/          // screenshots, icons
scripts/         // build helpers (optional)
```

## Build, Test, and Run

- Install: `npm install`
- Build: `npm run build` — bundles `src/` to `main.js` (production config).
- Test: `npm test` — unit tests (if present).
- Lint/Format: `npm run lint` and `npm run format` before pushing.
- Local Obsidian test: symlink the repo to your vault: `ln -s "$(pwd)" /path/to/Vault/.obsidian/plugins/inklings-focus` then reload plugins in Obsidian.

## Coding Style & Naming Conventions

- Language: TypeScript preferred; 2-space indentation.
- Naming: camelCase for vars/functions; PascalCase for classes/types; kebab-case for file and folder names.
- Tools: ESLint (recommended rules) + Prettier. Keep imports sorted; avoid default exports in core modules.

## Testing Guidelines

- Framework: Vitest. Place tests in `tests/` mirroring `src/` paths.
- Names: `*.spec.ts` or `*.test.ts`.
- Coverage: target ≥80% for core logic (`src/core/*`).
- Run focused tests locally (`vitest -t "deck"`) and ensure deck, snooze, and date header behaviors are covered.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits (e.g., `feat: shuffle deck on session start`, `fix: insert ### <today> header`).
- PRs: small, descriptive, and linked to issues; include screenshots/GIFs of the Focus view when UI changes.
- Checks: CI must pass build, lint, and tests; update `PRD.md` when behavior changes.

## Security & Configuration Tips

- Never commit vault content or secrets. No tokens are required; if configuration is needed, document it in `README.md` and provide safe defaults.
