import { App, Modal, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext, editorViewField } from "obsidian";
import { ViewPlugin, ViewUpdate, DecorationSet, Decoration, EditorView, WidgetType } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

interface TimestampPickerSettings {
    pattern: string;
}

const DEFAULT_SETTINGS: TimestampPickerSettings = {
    pattern: "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}",
};

class TimestampPickerModal extends Modal {
    private dateInput: HTMLInputElement;
    private timeInput: HTMLInputElement;
    private onSave: (newValue: string) => void;

    constructor(app: App, currentValue: string, onSave: (newValue: string) => void) {
        super(app);
        this.onSave = onSave;

        const parts = currentValue.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
        const currentDate = parts ? parts[1] : new Date().toISOString().split("T")[0];
        const currentTime = parts ? parts[2] : "12:00";

        this.modalEl.addClass("timestamp-picker-modal");
        this.titleEl.setText("Edit Timestamp");

        const dateContainer = this.contentEl.createDiv();
        dateContainer.createEl("label", { text: "Date" }).style.cssText =
            "display: block; font-weight: 600; margin-bottom: 4px; font-size: 0.9em;";
        this.dateInput = dateContainer.createEl("input", { type: "date", value: currentDate });

        const timeContainer = this.contentEl.createDiv();
        timeContainer.style.marginTop = "12px";
        timeContainer.createEl("label", { text: "Time" }).style.cssText =
            "display: block; font-weight: 600; margin-bottom: 4px; font-size: 0.9em;";
        this.timeInput = timeContainer.createEl("input", { type: "time", value: currentTime });

        const btnRow = this.contentEl.createDiv({ cls: "modal-button-row" });
        const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
        cancelBtn.addEventListener("click", () => this.close());
        const saveBtn = btnRow.createEl("button", { text: "Save", cls: "mod-cta" });
        saveBtn.addEventListener("click", () => this.save());

        this.contentEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); this.save(); }
        });
    }

    private save() {
        this.onSave(`${this.dateInput.value} ${this.timeInput.value}`);
        this.close();
    }

    onOpen() { this.dateInput.focus(); }
}

// Widget for Live Preview
class TimestampWidget extends WidgetType {
    constructor(
        private value: string,
        private from: number,
        private to: number,
        private app: App
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");
        span.className = "timestamp-picker-clickable";
        span.textContent = this.value;

        span.addEventListener("mousedown", (evt) => {
            evt.preventDefault();
            evt.stopPropagation();

            new TimestampPickerModal(this.app, this.value, (newValue) => {
                view.dispatch({
                    changes: { from: this.from, to: this.to, insert: newValue },
                });
            }).open();
        });

        return span;
    }

    eq(other: TimestampWidget): boolean {
        return this.value === other.value && this.from === other.from;
    }

    ignoreEvent(event: Event): boolean {
        return event.type !== "mousedown";
    }
}

export default class TimestampPickerPlugin extends Plugin {
    settings: TimestampPickerSettings;

    async onload() {
        await this.loadSettings();

        // Reading view
        this.registerMarkdownPostProcessor((el, ctx) => this.processTimestamps(el, ctx));

        // Live Preview
        this.registerEditorExtension(this.createEditorExtension());

        this.addSettingTab(new TimestampPickerSettingTab(this.app, this));
    }

    createEditorExtension() {
        const plugin = this;
        return ViewPlugin.fromClass(
            class {
                decorations: DecorationSet;

                constructor(view: EditorView) {
                    this.decorations = this.buildDecorations(view);
                }

                update(update: ViewUpdate) {
                    if (update.docChanged || update.viewportChanged || update.selectionSet) {
                        this.decorations = this.buildDecorations(update.view);
                    }
                }

                buildDecorations(view: EditorView): DecorationSet {
                    const builder = new RangeSetBuilder<Decoration>();
                    const regex = new RegExp(plugin.settings.pattern, "g");
                    const doc = view.state.doc;
                    const selection = view.state.selection.main;

                    for (const { from, to } of view.visibleRanges) {
                        const text = doc.sliceString(from, to);
                        let match: RegExpExecArray | null;
                        regex.lastIndex = 0;

                        while ((match = regex.exec(text)) !== null) {
                            const matchFrom = from + match.index;
                            const matchTo = matchFrom + match[0].length;

                            // Don't decorate if cursor is inside the timestamp
                            if (selection.from >= matchFrom && selection.from <= matchTo) {
                                continue;
                            }

                            // Skip if inside frontmatter
                            const lineNum = doc.lineAt(matchFrom).number;
                            const firstLine = doc.line(1).text;
                            if (firstLine === "---") {
                                let inFrontmatter = true;
                                for (let i = 2; i <= Math.min(lineNum, doc.lines); i++) {
                                    if (doc.line(i).text === "---") {
                                        inFrontmatter = i >= lineNum;
                                        break;
                                    }
                                }
                                if (inFrontmatter) continue;
                            }

                            builder.add(
                                matchFrom,
                                matchTo,
                                Decoration.replace({
                                    widget: new TimestampWidget(
                                        match[0],
                                        matchFrom,
                                        matchTo,
                                        plugin.app
                                    ),
                                })
                            );
                        }
                    }

                    return builder.finish();
                }
            },
            { decorations: (v) => v.decorations }
        );
    }

    processTimestamps(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const regex = new RegExp(this.settings.pattern, "g");
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];

        let node: Text | null;
        while ((node = walker.nextNode() as Text)) {
            if (regex.test(node.textContent || "")) {
                textNodes.push(node);
            }
            regex.lastIndex = 0;
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || "";
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            regex.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }

                const span = document.createElement("span");
                span.className = "timestamp-picker-clickable";
                span.textContent = match[0];
                const matchedValue = match[0];

                span.addEventListener("click", (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    new TimestampPickerModal(this.app, matchedValue, async (newValue) => {
                        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                        if (file && "path" in file) {
                            await this.app.vault.process(file as any, (data: string) =>
                                data.replace(matchedValue, newValue)
                            );
                        }
                    }).open();
                });

                fragment.appendChild(span);
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            textNode.parentNode?.replaceChild(fragment, textNode);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class TimestampPickerSettingTab extends PluginSettingTab {
    plugin: TimestampPickerPlugin;

    constructor(app: App, plugin: TimestampPickerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Timestamp pattern")
            .setDesc("Regex pattern to match timestamps in notes")
            .addText((text) =>
                text
                    .setPlaceholder("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}")
                    .setValue(this.plugin.settings.pattern)
                    .onChange(async (value) => {
                        this.plugin.settings.pattern = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
