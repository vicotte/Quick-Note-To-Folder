import {
	Plugin,
	Editor,
	PluginSettingTab,
	Setting,
	App,
	Modal,
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
		noteName: string,
		folder: { folderName: string }
	): Promise<{ newFilePath: string; newNoteName: string }> {
		noteName = noteName.trim();
		if (noteName.match(/[:;,.?*!()[\]{}<>/\\|'"`~]/g)) {
			new Notice(`Invalid character highlighted`).noticeEl.addClass(
				"notice-error"
			);
			throw new Error("Invalid character highlighted");
		}

		const newFilePath = folder.folderName + "/" + noteName + ".md";
		const OFolder = this.app.vault.getAbstractFileByPath(folder.folderName);
		const OFile = this.app.vault.getAbstractFileByPath(newFilePath);

		OFolder === null &&
			(await this.app.vault.createFolder(folder.folderName));

		OFile === null
			? await this.app.vault.create(newFilePath, "")
			: new Notice(`file already existing...\n adding link`);

		return {
			newFilePath: newFilePath,
			newNoteName: noteName,
		};
	}

	async addCommandNewFile(folder: { folderName: string }) {
		this.addCommand({
			id: "create-note-to-folder-" + folder.folderName,
			name: "Create Note to folder " + folder.folderName,
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
		this.add_general_setting_header();

		new Setting(containerEl)
			.setName("Add New Folder")
			.setDesc(
				"List all the folders you want to add a shortcut to create a new note in that folder \n after adding a new folder, you need to reload the plugin and then add the shortcut for the folder in the shortcut manager"
			);

		this.plugin.settings.folders.forEach((folder, index) => {
			const s = new Setting(containerEl)
				.setName(`Folder Name ${index + 1}`)
				.addText((text) => {
					text.setPlaceholder("Enter the folder name")
						.setValue(folder.folderName)
						.onChange(async (value) => {
							folder.folderName = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.addClass("option-text");
				})
				.addButton((button) =>
					button.setButtonText("-").onClick(() => {
						this.plugin.settings.folders.splice(index, 1);
						this.plugin.saveSettings();
						this.display();
					})
				);
			// button to add hotkey. Work in progress

			// .addButton((button) =>
			// 	button.setButtonText("hotkey").onClick(() => {
			// 		app.setting.openTabById("hotkeys");
			// 		const tab = (this.app.tab.searchInputEl.value =
			// 			"manager");
			// 		tab.updateHotkeyVisibility();
			// 	})
			// );
			s.infoEl.remove();
		});

		new Setting(containerEl).addButton((button) => {
			button
				.setButtonText("Add new folder shortcut")
				.setCta()
				.onClick(() => {
					this.plugin.settings.folders.push({
						folderName: "",
					});
					this.plugin.saveSettings();
					this.display();

					button.buttonEl.addClass("button-add");
				});
		});
	}

	add_general_setting_header(): void {
		this.containerEl.createEl("h1", { text: "General Settings" });
	}
}
