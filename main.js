"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => InklingsFocusPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  folder: "Inklings",
  snoozeDays: 3,
  dateHeaderLevel: "###"
};
var InklingsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Inklings Focus Settings" });
    new import_obsidian.Setting(containerEl).setName("Folder").setDesc("Top-level folder containing inklings (no subfolders).").addText(
      (t) => t.setPlaceholder("Inklings").setValue(this.plugin.settings.folder).onChange(async (v) => {
        this.plugin.settings.folder = v.trim() || "Inklings";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Snooze days").setDesc("Number of days to snooze when pressing Snooze.").addText(
      (t) => t.setPlaceholder("3").setValue(String(this.plugin.settings.snoozeDays)).onChange(async (v) => {
        const n = Number(v);
        this.plugin.settings.snoozeDays = Number.isFinite(n) && n >= 0 ? n : 3;
        await this.plugin.saveSettings();
      })
    );
    const note = containerEl.createEl("div", { cls: "setting-item" });
    note.createEl("div", { text: "Date header level is fixed to ### per PRD.", cls: "setting-item-description" });
  }
};

// src/ui/FocusView.ts
var import_obsidian3 = require("obsidian");

// src/core/dates.ts
function todayLocalISO() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dt = new Date(y, m, d);
  return isoFromDate(dt);
}
function addDaysISO(iso, days) {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoFromDate(dt);
}
function isoFromDate(dt) {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const d = dt.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// src/core/deck.ts
async function buildDeck(app, settings) {
  const folder = normalizeFolder(settings.folder);
  const today = todayLocalISO();
  const files = app.vault.getFiles().filter((f) => f.extension === "md");
  const eligible = [];
  for (const f of files) {
    if (!isImmediateChildOfFolder(f, folder))
      continue;
    const fm = app.metadataCache.getCache(f.path)?.frontmatter;
    const snoozed = fm?.snoozed_until;
    if (snoozed && snoozed > today)
      continue;
    eligible.push(f);
  }
  return shuffle(eligible);
}
function normalizeFolder(folder) {
  return folder.replace(/^\/+|\/+$/g, "");
}
function isImmediateChildOfFolder(file, folder) {
  const parent = file.parent?.path ?? "";
  return parent === folder;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// src/ui/NewEntryModal.ts
var import_obsidian2 = require("obsidian");
var NewEntryModal = class extends import_obsidian2.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.value = "";
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "New Entry" });
    const textarea = contentEl.createEl("textarea", {
      cls: "inklings-input",
      attr: { rows: "8", placeholder: "Write today\u2019s blurb\u2026" }
    });
    textarea.addEventListener("input", () => {
      this.value = textarea.value;
    });
    new import_obsidian2.Setting(contentEl).addButton(
      (btn) => btn.setButtonText("Add").setCta().onClick(() => {
        this.close();
        this.onSubmit(this.value.trim());
      })
    ).addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
  }
};

// src/core/markdown.ts
function upsertTodayEntry(content, dateHeaderLevel, isoDate, newParagraph) {
  const header = `${dateHeaderLevel} ${isoDate}`;
  if (hasDateHeader(content, dateHeaderLevel, isoDate)) {
    return appendParagraphToDateSection(content, dateHeaderLevel, isoDate, newParagraph);
  }
  return insertNewDateSectionAtTop(content, dateHeaderLevel, isoDate, newParagraph);
}
function hasDateHeader(content, dateHeaderLevel, isoDate) {
  const escaped = dateHeaderLevel.replace(/[#]/g, "#");
  const re = new RegExp(`^${escaped}\\s+${isoDate}\\s*$`, "m");
  return re.test(content);
}
function insertNewDateSectionAtTop(content, dateHeaderLevel, isoDate, paragraph) {
  const lines = content.split(/\r?\n/);
  let insertIndex = 0;
  if (lines[0] === "---") {
    let i = 1;
    while (i < lines.length && lines[i] !== "---")
      i++;
    if (i < lines.length && lines[i] === "---")
      insertIndex = i + 1;
  }
  for (let i = insertIndex; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) {
      insertIndex = i + 1;
      if (lines[insertIndex] === "")
        insertIndex++;
      break;
    }
  }
  const headerBlock = [
    `${dateHeaderLevel} ${isoDate}`,
    paragraph.trim(),
    ""
  ].join("\n");
  const before = lines.slice(0, insertIndex).join("\n");
  const after = lines.slice(insertIndex).join("\n");
  const prefix = before.length ? before + "\n\n" : "";
  const suffix = after.length ? "\n" + after : "";
  return prefix + headerBlock + suffix;
}
function appendParagraphToDateSection(content, dateHeaderLevel, isoDate, paragraph) {
  const reHeader = new RegExp(`^${dateHeaderLevel.replace(/[#]/g, "#")}\\s+${isoDate}\\s*$`, "m");
  const match = reHeader.exec(content);
  if (!match)
    return content;
  const start = match.index + match[0].length;
  const reNextHeader = new RegExp(`^${dateHeaderLevel.replace(/[#]/g, "#")}\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`, "mg");
  reNextHeader.lastIndex = start;
  const next = reNextHeader.exec(content);
  const sectionEnd = next ? next.index : content.length;
  const before = content.slice(0, sectionEnd).replace(/\s*$/, "\n\n");
  const after = content.slice(sectionEnd);
  return before + paragraph.trim() + "\n" + after;
}
function upsertFrontmatterSnooze(content, targetISO) {
  const lines = content.split(/\r?\n/);
  if (lines[0] === "---") {
    let i = 1;
    let end = -1;
    for (; i < lines.length; i++) {
      if (lines[i] === "---") {
        end = i;
        break;
      }
    }
    if (end !== -1) {
      let found = false;
      for (let j = 1; j < end; j++) {
        if (lines[j].startsWith("snoozed_until:")) {
          lines[j] = `snoozed_until: ${targetISO}`;
          found = true;
          break;
        }
      }
      if (!found) {
        lines.splice(end, 0, `snoozed_until: ${targetISO}`);
      }
      return lines.join("\n");
    }
  }
  const fm = [`---`, `snoozed_until: ${targetISO}`, `---`, ""].join("\n");
  return fm + content;
}

// src/ui/FocusView.ts
var VIEW_TYPE = "inklings-focus-view";
var FocusView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.deck = [];
    this.index = 0;
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
  renderControls() {
    this.controlsEl.empty();
    const snoozeDays = this.plugin.settings.snoozeDays;
    this.addBtnEl = this.controlsEl.createEl("button", {
      text: "+",
      cls: "fab control-add",
      attr: { "aria-label": "Add entry" }
    });
    this.addBtnEl.addEventListener("click", () => this.openNewEntryModal());
    this.prevBtnEl = this.controlsEl.createEl("button", {
      text: "<",
      cls: "btn nav-left control-prev",
      attr: { "aria-label": "Previous" }
    });
    this.prevBtnEl.addEventListener("click", () => this.prev());
    this.snoozeBtnEl = this.controlsEl.createEl("button", { text: `Snooze for ${snoozeDays}d`, cls: "btn control-snooze" });
    this.snoozeBtnEl.addEventListener("click", () => this.snoozeCurrent());
    this.nextBtnEl = this.controlsEl.createEl("button", {
      text: ">",
      cls: "btn nav-right control-next",
      attr: { "aria-label": "Next" }
    });
    this.nextBtnEl.addEventListener("click", () => this.next());
  }
  async renderCurrent() {
    this.contentElDiv.empty();
    const file = this.deck[this.index];
    if (!file) {
      this.renderEmptyState();
      this.controlsEl.style.display = "flex";
      this.updateControlsForFilePresence(false);
      return;
    }
    this.controlsEl.style.display = "flex";
    this.updateControlsForFilePresence(true);
    const md = await this.app.vault.read(file);
    const wrapper = this.contentElDiv.createDiv();
    const headerRow = wrapper.createDiv({ cls: "title-row" });
    const titleEl = headerRow.createEl("h1", { text: file.basename });
    titleEl.addClass("inline-title");
    const newBtn = headerRow.createEl("button", {
      cls: "title-new-btn",
      text: "New",
      attr: { "aria-label": "Create inkling", type: "button" }
    });
    newBtn.addEventListener("click", () => this.createInkling());
    const bodyEl = wrapper.createDiv();
    await import_obsidian3.MarkdownRenderer.renderMarkdown(md, bodyEl, file.path, this);
  }
  renderEmptyState() {
    const box = this.contentElDiv.createDiv();
    box.createEl("h3", { text: "No eligible inklings" });
    box.createEl("p", { text: "Shuffle a new deck or create a new inkling." });
    const actions = box.createDiv({ cls: "controls" });
    const shuffle2 = actions.createEl("button", { text: "Shuffle new deck", cls: "btn" });
    shuffle2.addEventListener("click", () => this.rebuildDeck());
    const create = actions.createEl("button", { text: "Create inkling", cls: "fab" });
    create.addEventListener("click", () => this.createInkling());
  }
  async createInkling() {
    const title = await promptTitle(this.app);
    if (!title)
      return;
    const folder = this.plugin.settings.folder.replace(/^\/+|\/+$/g, "");
    const path = `${folder}/${sanitizeFileName(title)}.md`;
    const body = "";
    const file = await this.app.vault.create(path, body);
    await this.rebuildDeck();
    const idx = this.deck.findIndex((f) => f.path === file.path);
    if (idx >= 0) {
      this.index = idx;
      await this.renderCurrent();
    }
  }
  async openNewEntryModal() {
    const file = this.deck[this.index];
    if (!file)
      return;
    new NewEntryModal(this.app, async (text) => {
      if (!text)
        return;
      const md = await this.app.vault.read(file);
      const today = todayLocalISO();
      const updated = upsertTodayEntry(md, this.plugin.settings.dateHeaderLevel, today, text);
      await this.app.vault.modify(file, updated);
      await this.renderCurrent();
    }).open();
  }
  async snoozeCurrent() {
    const file = this.deck[this.index];
    if (!file)
      return;
    const today = todayLocalISO();
    const target = addDaysISO(today, this.plugin.settings.snoozeDays);
    const md = await this.app.vault.read(file);
    const updated = upsertFrontmatterSnooze(md, target);
    await this.app.vault.modify(file, updated);
    const removedPath = file.path;
    this.deck = this.deck.filter((f) => f.path !== removedPath);
    if (this.index >= this.deck.length) {
      this.index = this.deck.length;
    }
    await this.renderCurrent();
  }
  async next() {
    if (this.index < this.deck.length - 1) {
      this.index++;
    } else {
      this.index = this.deck.length;
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
  updateControlsForFilePresence(hasFile) {
    if (!this.prevBtnEl || !this.nextBtnEl || !this.snoozeBtnEl || !this.addBtnEl)
      return;
    this.prevBtnEl.style.display = "inline-flex";
    const show = hasFile ? "inline-flex" : "none";
    this.nextBtnEl.style.display = show;
    this.snoozeBtnEl.style.display = show;
    this.addBtnEl.style.display = show;
  }
};
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}
async function promptTitle(app) {
  return new Promise((resolve) => {
    class TitleModal extends import_obsidian3.Modal {
      constructor() {
        super(...arguments);
        this.value = "";
      }
      onOpen() {
        this.contentEl.createEl("h3", { text: "Create inkling" });
        const input = this.contentEl.createEl("input", { attr: { placeholder: "Title" } });
        input.addEventListener("input", () => this.value = input.value);
        const setting = new import_obsidian3.Setting(this.contentEl);
        setting.addButton(
          (b) => b.setButtonText("Create").setCta().onClick(() => {
            this.close();
            resolve(this.value.trim() || null);
          })
        ).addButton((b) => b.setButtonText("Cancel").onClick(() => {
          this.close();
          resolve(null);
        }));
      }
    }
    new TitleModal(app).open();
  });
}

// src/main.ts
var InklingsFocusPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(
      VIEW_TYPE,
      (leaf) => new FocusView(leaf, this)
    );
    this.addCommand({
      id: "inklings-open-focus",
      name: "Open Focus",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "inklings-add-entry",
      name: "Add Entry (current)",
      checkCallback: (checking) => {
        const view = this.getFocusView();
        if (view) {
          if (!checking)
            view.openNewEntryModal();
          return true;
        }
        return false;
      }
    });
    this.addCommand({
      id: "inklings-snooze",
      name: "Snooze (current)",
      checkCallback: (checking) => {
        const view = this.getFocusView();
        if (view) {
          if (!checking)
            view.snoozeCurrent();
          return true;
        }
        return false;
      }
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
  getFocusView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length)
      return leaves[0].view;
    return null;
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
