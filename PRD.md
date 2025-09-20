# PRD — Inklings Focus (as built)

## 1) Purpose

Surface one inkling (note) at a time so you can quickly add a dated blurb, snooze it, or delete it and move on. Works on Obsidian Mobile and Desktop.

## 2) Scope (implemented)

- Obsidian plugin with a single Focus view.
- Title area shows the note title; tap it to rename the file.
- Top‑right actions (stacked, right‑aligned):
  - New — create a new inkling.
  - Snooze — “zzz” button snoozes current inkling.
  - Delete — red “X”, permanently deletes the note (with confirmation).
- Body shows the note rendered markdown.
- Bottom controls: “<” Previous, “+” Add Entry, “>” Next.
- Daily deck with progress counter “x of N today” in the controls bar.
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
  - Builds or loads today’s deck: a fixed, persisted sample of up to `dailyCount` eligible inklings (see Deck construction). Shows the first item.

- Add Entry
  - Tap “+” → multiline entry modal.
  - If `###### <today>` exists: append a new paragraph under it.
  - Else insert a new `###### <today>` section at the top (after frontmatter and H1 if present).

- Snooze
  - Tap “zzz” → write/update `snoozed_until = today + N days` (default 3).
  - Removes the note from today’s deck (persisted) and re-renders.

- Delete
  - Tap red “X” → confirmation modal → permanently deletes the file.
  - Removes the note from today’s deck and re-renders.

- Navigation
  - “>” next advances within the deck; going past the last shows an empty state.
  - “<” previous moves back only within items already seen in this session.
  - Empty state shows “Done for today!”, “Reset today’s deck”, and “Create inkling”. Previous remains visible.

- Create Inkling
  - From top‑right “New” or empty state “Create inkling”.
  - Validates filename length (<=255 bytes including `.md`) and disallows invalid characters (`/ \ : * " < > |`). `?` is allowed.
  - Creates `folder/<title>.md` with empty body. New notes do not join today’s deck; they’re eligible starting tomorrow.

- Rename Inkling
  - Tap the title to rename; same validation as creation.

## 5) Deck construction

- Eligible files:
  - Markdown files directly under the configured folder (no subfolders).
  - Excludes notes with `snoozed_until > today`.
- Daily sample (persisted):
  - On first open each day (or date change), shuffle all eligible and take the first `dailyCount` (default 10). Persist only their paths and the total for that day.
  - The day’s deck is stable; it does not backfill mid‑day if you snooze/delete/rename or add new notes.
  - Snooze or delete removes the note from today’s deck. Rename updates the stored path.
- Empty state appears when you advance past the last item or remove the remaining ones. “Reset today’s deck” replaces today’s sample with a fresh one.
- Index‑based navigation; Previous only moves back within items already seen today.

## 6) Settings

- `folder` (string, default `Inklings/`).
- `snoozeDays` (integer, default `3`).
- `dateHeaderLevel` (string, default `"######"`); fixed via UI note, not user‑toggled.
- `dailyCount` (integer, default `10`) — number of inklings sampled into today’s deck.

## 7) UI details

- Theme-aware colors; date headers render smaller and muted in Focus.
- Date sections written as `###### YYYY-MM-DD` in the file.
- Top‑right actions (New, Snooze, Delete) stay anchored regardless of title wrapping.
- Controls bar shows prev/next, add entry, and the counter “x of N today”.
- Empty state headline: “Done for today!”.

## 8) Edge cases & behavior

- No eligible notes → empty state with “Done for today!”, “Reset today’s deck”, and “Create inkling”.
- New notes created mid‑day do not appear until the next day’s deck.
- Malformed/missing date headers → adding an entry creates `###### <today>` at top.
- Concurrent edits → last write wins.
- Deck persistence: the daily deck is stored by paths; missing files are silently dropped.
- Deck rebuild/reset: “Reset today’s deck” (empty state button) creates a new daily sample for the current date.

## 9) Commands & deep links

- Commands: Open Focus, Add Entry (current), Snooze (current). (Planned: “Reset today’s deck”.)
- Deep link: `obsidian://inklings-focus` opens the Focus view (use from iOS Shortcuts).
