import { App, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, InklingsSettingTab, InklingsSettings } from "./settings";
import { FocusView, VIEW_TYPE } from "./ui/FocusView";
import { todayLocalISO } from "./core/dates";
import { buildDeck } from "./core/deck";

interface DailyDeck {
  date: string; // YYYY-MM-DD (local)
  paths: string[]; // file paths persisted for the day
  total: number; // original size chosen for the day
}

interface PluginDataV2 {
  settings: InklingsSettings;
  dailyDeck: DailyDeck | null;
}

export default class InklingsFocusPlugin extends Plugin {
  settings: InklingsSettings = DEFAULT_SETTINGS;
  private dailyDeck: DailyDeck | null = null;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new FocusView(leaf, this)
    );

    // Protocol handler: obsidian://inklings-focus → open Focus view
    this.registerObsidianProtocolHandler("inklings-focus", async () => {
      await this.activateView();
    });

    this.addCommand({
      id: "inklings-open-focus",
      name: "Open Focus",
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: "inklings-add-entry",
      name: "Add Entry (current)",
      checkCallback: (checking) => {
        const view = this.getFocusView();
        if (view) {
          if (!checking) view.openNewEntryModal();
          return true;
        }
        return false;
      },
    });

    this.addCommand({
      id: "inklings-snooze",
      name: "Snooze (current)",
      checkCallback: (checking) => {
        const view = this.getFocusView();
        if (view) {
          if (!checking) view.snoozeCurrent();
          return true;
        }
        return false;
      },
    });

    this.addSettingTab(new InklingsSettingTab(this.app, this));
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    } else {
      workspace.revealLeaf(leaf);
    }
  }

  getFocusView(): FocusView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length) return leaves[0].view as FocusView;
    return null;
  }

  onunload() {}

  async loadSettings() {
    const raw = (await this.loadData()) as any;
    if (raw && typeof raw === "object" && "settings" in raw) {
      const v2 = raw as PluginDataV2;
      this.settings = Object.assign({}, DEFAULT_SETTINGS, v2.settings);
      this.dailyDeck = v2.dailyDeck ?? null;
    } else {
      // Back-compat for older shape where only settings were stored
      this.settings = Object.assign({}, DEFAULT_SETTINGS, raw || {});
      this.dailyDeck = null;
    }
  }

  async saveSettings() {
    const data: PluginDataV2 = { settings: this.settings, dailyDeck: this.dailyDeck };
    await this.saveData(data);
  }

  // Daily deck helpers (Option 1: Daily Quota Sample)
  async getOrBuildTodayDeck(): Promise<TFile[]> {
    const today = todayLocalISO();
    if (!this.dailyDeck || this.dailyDeck.date !== today) {
      // Build fresh deck for today (sample once, no backfill mid-day)
      const eligible = await buildDeck(this.app, this.settings); // shuffled
      const chosen = eligible.slice(0, Math.max(0, this.settings.dailyCount));
      this.dailyDeck = { date: today, paths: chosen.map((f) => f.path), total: chosen.length };
      await this.saveSettings();
    }
    // Resolve to TFiles; drop missing
    const files: TFile[] = [];
    const keepPaths: string[] = [];
    for (const p of this.dailyDeck.paths) {
      const af = this.app.vault.getAbstractFileByPath(p);
      if (af && af instanceof TFile) {
        files.push(af);
        keepPaths.push(p);
      }
    }
    // If any were missing, persist the reduced list (no backfill today)
    if (this.dailyDeck.paths.length !== keepPaths.length) {
      this.dailyDeck.paths = keepPaths;
      await this.saveSettings();
    }
    return files;
  }

  async removeFromTodayDeck(path: string): Promise<void> {
    if (!this.dailyDeck) return;
    const before = this.dailyDeck.paths.length;
    this.dailyDeck.paths = this.dailyDeck.paths.filter((p) => p !== path);
    if (this.dailyDeck.paths.length !== before) await this.saveSettings();
  }

  async replacePathInTodayDeck(oldPath: string, newPath: string): Promise<void> {
    if (!this.dailyDeck) return;
    let changed = false;
    this.dailyDeck.paths = this.dailyDeck.paths.map((p) => {
      if (p === oldPath) {
        changed = true;
        return newPath;
      }
      return p;
    });
    if (changed) await this.saveSettings();
  }

  async resetTodayDeck(): Promise<void> {
    const today = todayLocalISO();
    const eligible = await buildDeck(this.app, this.settings); // shuffled
    const chosen = eligible.slice(0, Math.max(0, this.settings.dailyCount));
    this.dailyDeck = { date: today, paths: chosen.map((f) => f.path), total: chosen.length };
    await this.saveSettings();
  }

  getTodayDeckStats(): { total: number; remaining: number } {
    const today = todayLocalISO();
    if (!this.dailyDeck || this.dailyDeck.date !== today) return { total: 0, remaining: 0 };
    const total = typeof this.dailyDeck.total === "number" ? this.dailyDeck.total : this.dailyDeck.paths.length;
    const remaining = this.dailyDeck.paths.length;
    return { total, remaining };
  }
}
