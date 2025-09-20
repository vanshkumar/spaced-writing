import { App, PluginSettingTab, Setting } from "obsidian";

export interface InklingsSettings {
  folder: string; // e.g., "Inklings"
  snoozeDays: number; // default 3
  dateHeaderLevel: string; // fixed default level
  dailyCount: number; // number of cards per day
}

export const DEFAULT_SETTINGS: InklingsSettings = {
  folder: "Inklings",
  snoozeDays: 3,
  dateHeaderLevel: "######",
  dailyCount: 10,
};

export class InklingsSettingTab extends PluginSettingTab {
  plugin: { settings: InklingsSettings; saveSettings: () => Promise<void> };

  constructor(app: App, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Inklings Focus Settings" });

    new Setting(containerEl)
      .setName("Folder")
      .setDesc("Top-level folder containing inklings (no subfolders).")
      .addText((t) =>
        t
          .setPlaceholder("Inklings")
          .setValue(this.plugin.settings.folder)
          .onChange(async (v) => {
            this.plugin.settings.folder = v.trim() || "Inklings";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Snooze days")
      .setDesc("Number of days to snooze when pressing Snooze.")
      .addText((t) =>
        t
          .setPlaceholder("3")
          .setValue(String(this.plugin.settings.snoozeDays))
          .onChange(async (v) => {
            const n = Number(v);
            this.plugin.settings.snoozeDays = Number.isFinite(n) && n >= 0 ? n : 3;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily count")
      .setDesc("How many inklings to include in today’s deck.")
      .addText((t) =>
        t
          .setPlaceholder("10")
          .setValue(String(this.plugin.settings.dailyCount))
          .onChange(async (v) => {
            const n = Number(v);
            this.plugin.settings.dailyCount = Number.isFinite(n) && n >= 0 ? n : 10;
            await this.plugin.saveSettings();
          })
      );

    const note = containerEl.createEl("div", { cls: "setting-item" });
    note.createEl("div", { text: "Date header level is fixed to ######.", cls: "setting-item-description" });
  }
}
