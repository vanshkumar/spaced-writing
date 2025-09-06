# PRD — Inklings Focus (as built)

## 1) Purpose

Surface one inkling (note) at a time so you can quickly add a dated blurb or snooze it and move on. Works on Obsidian Mobile and Desktop.

## 2) Scope (implemented)

- Obsidian plugin with a single Focus view.
- Title area shows the note title; tap it to rename the file.
- Top‑right actions:
  - New: create a new inkling (small button).
  - Snooze: “zzz” button snoozes current inkling.
- Body shows the note rendered markdown.
- Bottom controls: “<” Previous, “+” Add Entry, “>” Next.
- Keyboard: ArrowLeft/ArrowRight for prev/next on desktop.
- No swipe gestures.

## 3) Data model & file format

- Folder (setting): default `Inklings/` (no subfolders).
- Frontmatter (optional):

  ```yaml
  ---
  snoozed_until: 2025-09-08   # ISO date; when present and > today, exclude from deck
  ---
  ```
- Body (reverse chronological by section):

  ```md
  ###### 2025-09-05
  Today’s blurb…

  ###### 2025-08-27
  Earlier thought…
  ```
- Plugin never writes `lastmod`.

## 4) Actions & flows

- Open Focus
  - Command: “Inklings: Open Focus” or obsidian://inklings-focus.
  - Builds a randomized deck of eligible inklings and shows the first item.

- Add Entry
  - Tap “+” → multiline entry modal.
  - If `###### <today>` exists: append a new paragraph under it.
  - Else insert a new `###### <today>` section at the top (after frontmatter and H1 if present).

- Snooze
  - Tap “zzz” → write/update `snoozed_until = today + N days` (default 3).
  - Removes current note from this session’s deck and re-renders.

- Navigation
  - “>” next advances within the deck; going past the last shows an empty state.
  - “<” previous moves back only within items already seen in this session.
  - Empty state shows “Shuffle new deck” and “Create inkling”; the bottom Previous button remains visible.

- Create Inkling
  - From top‑right “New” or empty state “Create inkling”.
  - Validates filename length (<=255 bytes including `.md`) and disallows invalid characters (`/ \ : * " < > |`). `?` is allowed.
  - Creates `folder/<title>.md` with empty body, adds to deck, focuses it.

- Rename Inkling
  - Tap the title to rename; same validation as creation.

## 5) Deck construction

- Eligible files:
  - Markdown files directly under the configured folder (no subfolders).
  - Excludes notes with `snoozed_until > today`.
- Order: Fisher–Yates shuffle of all eligible on session build.
- Index based navigation; previous only goes back within the current session history.

## 6) Settings

- `folder` (string, default `Inklings/`).
- `snoozeDays` (integer, default `3`).
- `dateHeaderLevel` (string, default `"######"`); fixed via UI note, not user‑toggled.

## 7) UI details

- Theme-aware colors; date headers render smaller and muted in Focus.
- Date sections written as `###### YYYY-MM-DD` in the file.
- Top‑right actions (New, Snooze) stay anchored regardless of title wrapping.
- Bottom controls show prev/next and add entry; Previous persists on empty deck.

## 8) Edge cases & behavior

- No eligible notes → empty state with “Create inkling” and “Shuffle new deck”.
- Malformed/missing date headers → adding an entry creates `###### <today>` at top.
- Concurrent edits → last write wins.
- Vault change listeners are not global; deck is rebuilt when creating/renaming via the view or by pressing “Shuffle new deck”.

## 9) Commands & deep links

- Commands: Open Focus, Add Entry (current), Snooze (current).
- Deep link: `obsidian://inklings-focus` opens the Focus view (use from iOS Shortcuts).
