import { App, Plugin, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, InklingsSettingTab, InklingsSettings } from "./settings";
import { FocusView, VIEW_TYPE } from "./ui/FocusView";

export default class InklingsFocusPlugin extends Plugin {
  settings: InklingsSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new FocusView(leaf, this)
    );

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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

