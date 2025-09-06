# Repository Guidelines — Inklings Focus (as built)

These notes reflect the current, personal plugin setup — only what’s implemented today.

## Project Structure

```
manifest.json    // Obsidian plugin manifest
versions.json    // Obsidian compatibility map
styles.css       // Plugin styles
src/             // TypeScript source (entry: main.ts)
  core/          // deck building, snooze, markdown helpers
  ui/            // Focus view components
assets/          // screenshots, icons
scripts/         // build helpers (deploy script)
```

## Build & Run

- Install: `npm install`
- Build: `npm run build` — bundles `src/` to `main.js` and auto‑deploys to your Obsidian plugins folder.
- Reload in Obsidian: toggle the plugin off/on after each build to pick up changes.
- Local Obsidian test: symlink the repo into your vault:
  - `ln -s "$(pwd)" /path/to/Vault/.obsidian/plugins/inklings-focus`
- Quick open: deep link `obsidian://inklings-focus` (use in iOS Shortcuts).

Deployment
- Default deploy path (macOS iCloud): `$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/Personal/.obsidian/plugins/inklings-focus`
- Override destination: set `OBSIDIAN_PLUGINS_DIR` before `npm run build`.

## Coding Style

- TypeScript, 2‑space indentation.
- Naming: camelCase for vars/functions; PascalCase for classes/types; kebab‑case for filenames.
- Formatting: Prettier (`npm run format`).

## Scope clarifications

- No tests (personal plugin).
- No swipe gestures; navigation via buttons/arrow keys only.
- Date sections written as pure Markdown headers (`###### YYYY-MM-DD`).
- Deep link registered: `obsidian://inklings-focus` opens the Focus view.

## Security

- Never commit vault content or secrets. No tokens are required.
