#!/usr/bin/env bun

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { getGuaranteedRepositoryNameAsync } from "./utilities/git-utilities";
import scriptConsole from "./utilities/script-console";

const CWD = process.cwd();

function toKebabCase(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase()
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function fixWord(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function toPascalCase(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[\s_-]+/g, " ")
		.split(" ")
		.map(fixWord)
		.join("");
}

function pathify(paths: ReadonlyArray<string>): ReadonlyArray<string> {
	return paths.map((path) => join(CWD, path));
}

const enum InitializeType {
	Name = 0,
	Source = 1,
}

interface Metadata {
	readonly files: ReadonlyArray<string>;
}

const InitializeTypeMeta: Readonly<Record<InitializeType, Metadata>> = {
	[InitializeType.Name]: {
		files: pathify(["smart-bun-cli-template.code-workspace"]),
	},

	[InitializeType.Source]: {
		files: pathify([
			".gitignore",
			"package.json",
			"README.md",
			".gemini/styleguide.md",
			".github/workflows/release.yml",
			"scripts/changelogged.ts",
			"scripts/create-changelog.ts",
			"scripts/create-release.ts",
			"scripts/download-latest-release.sh",
			"src/commands/clean-logs.ts",
			"src/logging/logger.ts",
			"test/constants/application-paths.test.ts",
		]),
	},
};

async function existsAsync(filePath: string): Promise<boolean> {
	try {
		const stats = await stat(filePath);
		return stats.isFile() || stats.isDirectory();
	} catch {
		return false;
	}
}

const KEBAB_REGEX = /smart-bun-cli-template/g;
const PASCAL_REGEX = /PASCAL_smart-bun-cli-template/g;

function replaceTemplate(repositoryName: string, value: string): string {
	return value.replace(PASCAL_REGEX, toPascalCase(repositoryName)).replace(KEBAB_REGEX, toKebabCase(repositoryName));
}

async function renameAsync(filePath: string, newFilePath: string): Promise<void> {
	const file = Bun.file(filePath);
	const exists = await file.exists();
	if (!exists) {
		scriptConsole.warn(`File '${filePath}' does not exist`);
		return;
	}

	const newFile = Bun.file(newFilePath);
	const newExists = await newFile.exists();
	if (newExists) {
		scriptConsole.warn(`File '${newFilePath}' already exists`);
		return;
	}

	const content = await file.text();
	await file.delete();
	await newFile.write(content);
}

const CODE_WORKSPACE_GLOB = new Bun.Glob("*.code-workspace");
async function findFirstCodeWorkspaceAsync(): Promise<string | undefined> {
	for await (const filePath of CODE_WORKSPACE_GLOB.scan(CWD)) return filePath;
	return undefined;
}

async function updateSourceAsync(repositoryName: string, filePath: string): Promise<void> {
	const exists = await existsAsync(filePath);
	if (!exists) {
		scriptConsole.warn(`File '${filePath}' does not exist`);
		return;
	}

	scriptConsole.info(`File '${filePath}' exists`);
	const file = Bun.file(filePath);
	const content = await file.text();

	const newFileContent = replaceTemplate(repositoryName, content);
	if (newFileContent === content) return;

	await file.write(newFileContent);
	scriptConsole.info(`Updated '${filePath}'`);
}

async function mainAsync(): Promise<void> {
	const repositoryName = await getGuaranteedRepositoryNameAsync();
	if (!repositoryName) process.exit(1);

	for (const filePath of InitializeTypeMeta[InitializeType.Name].files) {
		const exists = await existsAsync(filePath);
		if (exists) {
			scriptConsole.info(`File '${filePath}' exists`);
			const newFilePath = replaceTemplate(repositoryName, filePath);
			await renameAsync(filePath, newFilePath);
			scriptConsole.info(`Renamed '${filePath}' to '${newFilePath}'`);
		} else scriptConsole.warn(`File '${filePath}' does not exist`);
	}

	for (const filePath of InitializeTypeMeta[InitializeType.Source].files)
		await updateSourceAsync(repositoryName, filePath);

	const codeWorkspacePath = await findFirstCodeWorkspaceAsync();
	if (codeWorkspacePath) await updateSourceAsync(repositoryName, codeWorkspacePath);
	else scriptConsole.warn("No code-workspace file found, skipping update");
}

mainAsync().catch((error: unknown): never => {
	scriptConsole.error(`Error: ${error}`);
	process.exit(1);
});
