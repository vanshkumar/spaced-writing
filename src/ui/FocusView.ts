import {
  App,
  ItemView,
  MarkdownRenderer,
  Modal,
  Setting,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import type InklingsFocusPlugin from "../main";
import { buildDeck } from "../core/deck";
import { addDaysISO, todayLocalISO } from "../core/dates";
import { NewEntryModal } from "./NewEntryModal";
import { upsertFrontmatterSnooze, upsertTodayEntry } from "../core/markdown";

export const VIEW_TYPE = "inklings-focus-view";

export class FocusView extends ItemView {
  private plugin: InklingsFocusPlugin;
  private deck: TFile[] = [];
  private index = 0; // current position in deck
  private contentElDiv!: HTMLElement;
  private controlsEl!: HTMLElement;
  private addBtnEl!: HTMLElement;
  private prevBtnEl!: HTMLElement;
  private snoozeBtnEl!: HTMLElement;
  private nextBtnEl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: InklingsFocusPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Inklings Focus";
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    const root = container.createDiv({ cls: "inklings-focus" });
    this.contentElDiv = root.createDiv({ cls: "content" });
    this.controlsEl = root.createDiv({ cls: "controls" });

    this.renderControls();
    await this.rebuildDeck();

    // Keyboard navigation (prev/next)
    this.registerDomEvent(window, "keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        void this.prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        void this.next();
      }
    });
  }

  async rebuildDeck() {
    this.deck = await buildDeck(this.app, this.plugin.settings);
    this.index = 0;
    await this.renderCurrent();
  }

  private renderControls() {
    this.controlsEl.empty();
    const snoozeDays = this.plugin.settings.snoozeDays;

    this.addBtnEl = this.controlsEl.createEl("button", {
      text: "+",
      cls: "fab control-add",
      attr: { 'aria-label': "Add entry" },
    });
    this.addBtnEl.addEventListener("click", () => this.openNewEntryModal());

    // Prev / Next nav buttons anchored left/right
    this.prevBtnEl = this.controlsEl.createEl("button", {
      text: "<",
      cls: "btn nav-left control-prev",
      attr: { 'aria-label': "Previous" },
    });
    this.prevBtnEl.addEventListener("click", () => this.prev());

    this.snoozeBtnEl = this.controlsEl.createEl("button", { text: `Snooze for ${snoozeDays}d`, cls: "btn control-snooze" });
    this.snoozeBtnEl.addEventListener("click", () => this.snoozeCurrent());

    this.nextBtnEl = this.controlsEl.createEl("button", {
      text: ">",
      cls: "btn nav-right control-next",
      attr: { 'aria-label': "Next" },
    });
    this.nextBtnEl.addEventListener("click", () => this.next());
    // Hint/tooltip removed on request
  }

  async renderCurrent() {
    this.contentElDiv.empty();
    const file = this.deck[this.index];
    if (!file) {
      this.renderEmptyState();
      // Show controls bar but keep only Previous visible at end of deck
      this.controlsEl.style.display = "flex";
      this.updateControlsForFilePresence(false);
      return;
    }

    this.controlsEl.style.display = "flex";
    this.updateControlsForFilePresence(true);
    const md = await this.app.vault.read(file);
    const wrapper = this.contentElDiv.createDiv();

    // Title row with inline title and a 'New' icon button to create a new inkling
    const headerRow = wrapper.createDiv({ cls: "title-row" });
    const titleEl = headerRow.createEl("h1", { text: file.basename });
    titleEl.addClass("inline-title");
    const newBtn = headerRow.createEl("button", {
      cls: "title-new-btn",
      text: "New",
      attr: { 'aria-label': "Create inkling", type: "button" },
    });
    newBtn.addEventListener("click", () => this.createInkling());

    const bodyEl = wrapper.createDiv();
    await MarkdownRenderer.renderMarkdown(md, bodyEl, file.path, this);
  }

  private renderEmptyState() {
    const box = this.contentElDiv.createDiv();
    box.createEl("h3", { text: "No eligible inklings" });
    box.createEl("p", { text: "Shuffle a new deck or create a new inkling." });

    const actions = box.createDiv({ cls: "controls" });
    const shuffle = actions.createEl("button", { text: "Shuffle new deck", cls: "btn" });
    shuffle.addEventListener("click", () => this.rebuildDeck());

    const create = actions.createEl("button", { text: "Create inkling", cls: "fab" });
    create.addEventListener("click", () => this.createInkling());
  }

  async createInkling() {
    const title = await promptTitle(this.app);
    if (!title) return;
    const folder = this.plugin.settings.folder.replace(/^\/+|\/+$/g, "");
    const path = `${folder}/${sanitizeFileName(title)}.md`;
    const body = ""; // body starts empty; title is filename only
    const file = await this.app.vault.create(path, body);
    await this.rebuildDeck();
    // Focus this file if present in deck
    const idx = this.deck.findIndex((f) => f.path === file.path);
    if (idx >= 0) {
      this.index = idx;
      await this.renderCurrent();
    }
  }

  async openNewEntryModal() {
    const file = this.deck[this.index];
    if (!file) return;
    new NewEntryModal(this.app, async (text) => {
      if (!text) return;
      const md = await this.app.vault.read(file);
      const today = todayLocalISO();
      const updated = upsertTodayEntry(md, this.plugin.settings.dateHeaderLevel, today, text);
      await this.app.vault.modify(file, updated);
      await this.renderCurrent();
    }).open();
  }

  async snoozeCurrent() {
    const file = this.deck[this.index];
    if (!file) return;
    const today = todayLocalISO();
    const target = addDaysISO(today, this.plugin.settings.snoozeDays);
    const md = await this.app.vault.read(file);
    const updated = upsertFrontmatterSnooze(md, target);
    await this.app.vault.modify(file, updated);
    // Immediately remove from current session deck to reflect in UI
    const removedPath = file.path;
    this.deck = this.deck.filter((f) => f.path !== removedPath);
    if (this.index >= this.deck.length) {
      // Move to empty state or clamp to last item
      this.index = this.deck.length; // empty when length==0, else last+1 shows empty
    }
    await this.renderCurrent();
  }

  async next() {
    // Advance forward; when moving past the last item, show empty state
    if (this.index < this.deck.length - 1) {
      this.index++;
    } else {
      // Move to "empty" position
      this.index = this.deck.length; // one past last
    }
    await this.renderCurrent();
  }

  async prev() {
    if (this.index > 0) {
      this.index--;
      await this.renderCurrent();
    }
  }

  // Swiping removed intentionally; navigation via buttons or arrow keys only.

  private updateControlsForFilePresence(hasFile: boolean) {
    if (!this.prevBtnEl || !this.nextBtnEl || !this.snoozeBtnEl || !this.addBtnEl) return;
    // Always show Previous
    this.prevBtnEl.style.display = "inline-flex";
    // Show others only when a file is active
    const show = hasFile ? "inline-flex" : "none";
    this.nextBtnEl.style.display = show;
    this.snoozeBtnEl.style.display = show;
    this.addBtnEl.style.display = show;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

// Toggle visibility of controls depending on whether there is an active file
// Always keep Previous visible so you can navigate back from the empty state.
// (no-op helpers outside class)

async function promptTitle(app: App): Promise<string | null> {
  return new Promise((resolve) => {
    class TitleModal extends Modal {
      value = "";
      onOpen() {
        this.contentEl.createEl("h3", { text: "Create inkling" });
        const input = this.contentEl.createEl("input", { attr: { placeholder: "Title" } });
        input.addEventListener("input", () => (this.value = input.value));
        const setting = new Setting(this.contentEl);
        setting
          .addButton((b) =>
            b
              .setButtonText("Create")
              .setCta()
              .onClick(() => {
                this.close();
                resolve(this.value.trim() || null);
              })
          )
          .addButton((b) => b.setButtonText("Cancel").onClick(() => {
            this.close();
            resolve(null);
          }));
      }
    }
    new TitleModal(app).open();
  });
}
