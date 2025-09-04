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
  private swipe = { active: false, startX: 0, startY: 0, hasSwiped: false, pointerId: undefined as number | undefined };

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

    // Keyboard navigation
    this.registerDomEvent(window, "keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        this.prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        this.next();
      }
    });

    // Touch/Pointer swipe navigation on mobile
    this.setupSwipeHandlers();
  }

  async rebuildDeck() {
    this.deck = await buildDeck(this.app, this.plugin.settings);
    this.index = 0;
    await this.renderCurrent();
  }

  private renderControls() {
    this.controlsEl.empty();
    const snoozeTarget = addDaysISO(todayLocalISO(), this.plugin.settings.snoozeDays);

    const addBtn = this.controlsEl.createEl("button", { text: "+ Add", cls: "fab" });
    addBtn.addEventListener("click", () => this.openNewEntryModal());

    const snoozeBtn = this.controlsEl.createEl("button", { text: `Snooze ${snoozeTarget}`, cls: "btn" });
    snoozeBtn.addEventListener("click", () => this.snoozeCurrent());

    const hint = this.controlsEl.createEl("div", { text: "← / → to navigate", cls: "hint" });
    hint.setAttr("aria-hidden", "true");
  }

  async renderCurrent() {
    this.contentElDiv.empty();
    const file = this.deck[this.index];
    if (!file) {
      this.renderEmptyState();
      // Hide main controls when no active item
      this.controlsEl.style.display = "none";
      return;
    }

    this.controlsEl.style.display = "flex";
    const md = await this.app.vault.read(file);
    const wrapper = this.contentElDiv.createDiv();
    await MarkdownRenderer.renderMarkdown(md, wrapper, file.path, this);
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
    const body = `# ${title}\n\n`; // no frontmatter by default
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

  private setupSwipeHandlers() {
    const area = this.contentElDiv;
    // Pointer events (modern)
    this.registerDomEvent(area, "pointerdown", (ev) => {
      const e = ev as PointerEvent;
      if ((e as any).pointerType === "mouse") return; // prefer keyboard/clicks for mouse
      this.swipe.active = true;
      this.swipe.hasSwiped = false;
      this.swipe.pointerId = e.pointerId;
      this.swipe.startX = e.clientX;
      this.swipe.startY = e.clientY;
    });
    this.registerDomEvent(
      area,
      "pointermove",
      (ev) => {
        const e = ev as PointerEvent;
        if (!this.swipe.active || this.swipe.pointerId !== e.pointerId) return;
        const dx = e.clientX - this.swipe.startX;
        const dy = e.clientY - this.swipe.startY;
        if (this.swipe.hasSwiped) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          this.swipe.hasSwiped = true;
          e.preventDefault();
          e.stopPropagation();
          if (dx < 0) this.next();
          else this.prev();
        }
      },
      { passive: false } as any
    );
    this.registerDomEvent(area, "pointerup", (ev) => {
      const e = ev as PointerEvent;
      if (this.swipe.pointerId !== e.pointerId) return;
      this.swipe.active = false;
      this.swipe.pointerId = undefined;
      this.swipe.hasSwiped = false;
    });
    this.registerDomEvent(area, "pointercancel", () => {
      this.swipe.active = false;
      this.swipe.pointerId = undefined;
      this.swipe.hasSwiped = false;
    });

    // Touch events fallback
    this.registerDomEvent(area, "touchstart", (ev) => {
      const e = ev as TouchEvent;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.swipe.active = true;
      this.swipe.hasSwiped = false;
      this.swipe.startX = t.clientX;
      this.swipe.startY = t.clientY;
    });
    this.registerDomEvent(
      area,
      "touchmove",
      (ev) => {
        const e = ev as TouchEvent;
        if (!this.swipe.active || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - this.swipe.startX;
        const dy = t.clientY - this.swipe.startY;
        if (this.swipe.hasSwiped) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          this.swipe.hasSwiped = true;
          e.preventDefault();
          e.stopPropagation();
          if (dx < 0) this.next();
          else this.prev();
        }
      },
      { passive: false } as any
    );
    this.registerDomEvent(area, "touchend", () => {
      this.swipe.active = false;
      this.swipe.hasSwiped = false;
    });
    this.registerDomEvent(area, "touchcancel", () => {
      this.swipe.active = false;
      this.swipe.hasSwiped = false;
    });
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

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
