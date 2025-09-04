import { App, Modal, Setting } from "obsidian";

export class NewEntryModal extends Modal {
  private onSubmit: (text: string) => void;
  private value = "";

  constructor(app: App, onSubmit: (text: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "New Entry" });
    const textarea = contentEl.createEl("textarea", {
      cls: "inklings-input",
      attr: { rows: "8", placeholder: "Write today’s blurb…" },
    });
    textarea.addEventListener("input", () => {
      this.value = textarea.value;
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Add")
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.value.trim());
          })
      )
      .addButton((btn) => btn.setButtonText("Cancel").onClick(() => this.close()));
  }
}

