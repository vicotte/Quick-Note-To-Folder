import {
	Plugin,
	Editor,
	PluginSettingTab,
	Setting,
	App,
	Modal,
	TFolder,
	Notice,
} from "obsidian";

interface MyPluginSettings {
	folders: [
		{
			folderName: string;
		}
	];
}
const DEFAULT_SETTINGS: MyPluginSettings = {
	folders: [
		{
			folderName: "default",
		},
	],
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		for (let i = 0; i < this.settings.folders.length; i++) {
			this.addCommand({
				id:
					"create-note-from-highlight-" +
					this.settings.folders[i].folderName,
				name:
					"Create Note from Highlight - " +
					this.settings.folders[i].folderName,
				editorCallback: async (editor: Editor) => {
					const selectedText = editor.getSelection();
					if (!selectedText) return;

					const newNoteName = selectedText.trim();

					const folder = this.app.vault.getAbstractFileByPath(
						this.settings.folders[i].folderName
					);

					if (newNoteName) {
						new Notice(`Hello!`);
						const folderPath = this.settings.folders[i].folderName;
						const newNotePath = `${folderPath}/${newNoteName}.md`;

						if (!(folder instanceof TFolder)) {
							await this.app.vault.createFolder(folderPath);
						}
						await this.app.vault.create(newNotePath, "");
						const wikilink = `[[${newNoteName}]]`;
						editor.replaceSelection(wikilink);
					}
				},
			});
		}
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
}

class SampleModal extends Modal {
	plugin: MyPlugin;
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.plugin.settings.folders[0].folderName);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Folder Shortcuts")
			.setDesc("Define shortcuts for writing to different folders")
			.addButton((button) =>
				button.setButtonText("Add Shortcut").onClick(() => {
					this.plugin.settings.folders.push({
						folderName: "",
					});
					this.plugin.saveSettings();
					this.display();
				})
			);

		for (let i = 0; i < this.plugin.settings.folders.length; i++) {
			const folder = this.plugin.settings.folders[i];
			new Setting(containerEl)
				.setName("Folder Shortcuts")
				.setDesc("Define shortcuts for writing to different folders")
				.addText((text) =>
					text
						.setPlaceholder("Enter your secret")
						.setValue(folder.folderName)
						.onChange(async (value) => {
							folder.folderName = value;
							await this.plugin.saveSettings();
						})
				)
				.addButton((button) =>
					button.setButtonText("Remove").onClick(() => {
						this.plugin.settings.folders.splice(i, 1);
						this.plugin.saveSettings();
						this.display();
					})
				);
		}
	}
}
