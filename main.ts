import {
	Plugin,
	Editor,
	PluginSettingTab,
	Setting,
	App,
	Modal,
	TFolder,
	Notice,
	TFile,
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

	async writeFile(
		text: string,
		folder: { folderName: string }
	): Promise<{ newFilePath: string; newNoteName: string }> {
		const newNoteName = text.trim();
		if (newNoteName.match(/[:;,.?!()[\]{}<>/\\|'"`~]/g)) {
			new Notice(`Invalid character highlighted`).noticeEl.addClass(
				"notice-error"
			);
			throw new Error("Invalid character highlighted");
		}

		const newFilePath = folder.folderName + "/" + newNoteName + ".md";
		const OFolder = this.app.vault.getAbstractFileByPath(folder.folderName);
		const OFile = this.app.vault.getAbstractFileByPath(newFilePath);

		if (OFolder !== null && !(OFolder instanceof TFolder)) {
			await this.app.vault.createFolder(OFolder.path);
		}
		if (OFile instanceof TFile) {
			new Notice(`file already existing...\n adding link`);
		} else {
			await this.app.vault.create(newFilePath, "");
		}

		return {
			newFilePath: newFilePath,
			newNoteName: newNoteName,
		};
	}

	async addCommandNewFile(folder: { folderName: string }) {
		this.addCommand({
			id: "create-note-from-highlight-" + folder.folderName,
			name: "Create Note from Highlight - " + folder.folderName,
			editorCallback: async (editor: Editor) => {
				const selectedText = editor.getSelection();
				if (!selectedText) {
					//ask the user for a name of file
					new SampleModal(this.app, async (result) => {
						const newfile = await this.writeFile(result, folder);

						const file = this.app.vault.getAbstractFileByPath(
							newfile.newFilePath
						);

						if (file instanceof TFile) {
							this.app.workspace.openLinkText(file.path, "");
						}
					}).open();
				} else {
					const newFile = await this.writeFile(selectedText, folder);
					const { newFilePath, newNoteName } = newFile;
					const wikilink = `[[${newFilePath}|${newNoteName}]]`;
					editor.replaceSelection(wikilink);
				}
			},
		});
	}

	async onload() {
		await this.loadSettings();

		this.settings.folders.forEach((folder) => {
			this.addCommandNewFile(folder);
		});
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
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Create New Note" });
		contentEl.createEl("p", {
			text: "Enter the name of the new note",
		});
		new Setting(contentEl).setName("Name").addText((text) =>
			text.onChange((value) => {
				this.result = value;
			})
		);
		// Name.focus();
		// Name.select();

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.result);
				})
		);
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
