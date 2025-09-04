import { App, TFile } from "obsidian";
import type { InklingsSettings } from "../settings";
import { todayLocalISO } from "./dates";

export async function buildDeck(app: App, settings: InklingsSettings): Promise<TFile[]> {
  const folder = normalizeFolder(settings.folder);
  const today = todayLocalISO();
  const files = app.vault.getFiles().filter((f) => f.extension === "md");

  const eligible: TFile[] = [];
  for (const f of files) {
    if (!isImmediateChildOfFolder(f, folder)) continue; // no subfolders

    // snooze filter via frontmatter (string comparison works for YYYY-MM-DD)
    const fm = app.metadataCache.getCache(f.path)?.frontmatter as any | undefined;
    const snoozed: string | undefined = fm?.snoozed_until;
    if (snoozed && snoozed > today) continue; // still snoozed

    eligible.push(f);
  }

  return shuffle(eligible);
}

function normalizeFolder(folder: string): string {
  return folder.replace(/^\/+|\/+$/g, "");
}

function isImmediateChildOfFolder(file: TFile, folder: string): boolean {
  const parent = file.parent?.path ?? "";
  return parent === folder;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

