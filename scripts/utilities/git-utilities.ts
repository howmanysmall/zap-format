/* eslint-disable id-length -- shut up */
import { basename, join } from "node:path";

import scriptConsole from "./script-console";

const None = Symbol("None");
type None = typeof None;

let gitUrl: None | string | undefined = None;

const CWD = process.cwd();
const URL_REGEX = /url\s*=\s*([^\n]+)/g;
const REPOSITORY_NAME_REGEX = /\/([^/]+)%.git$/g;

export async function getUrlFromConfigurationAsync(): Promise<string | undefined> {
	if (gitUrl === None) {
		const configurationPath = join(CWD, ".git", "config");
		const file = Bun.file(configurationPath);
		const exists = await file.exists();
		if (!exists) {
			gitUrl = undefined;
			return undefined;
		}

		const content = await file.text();
		const urlMatch = URL_REGEX.exec(content);
		if (!urlMatch) {
			gitUrl = undefined;
			return undefined;
		}

		const url = urlMatch[1]?.trim();
		if (!url) {
			gitUrl = undefined;
			return undefined;
		}

		gitUrl = url;
		return url;
	}

	return gitUrl;
}

export async function getRepositoryNameFromConfigurationAsync(url?: string): Promise<string | undefined> {
	const repositoryUrl = url ?? (await getUrlFromConfigurationAsync());
	return repositoryUrl ? REPOSITORY_NAME_REGEX.exec(repositoryUrl)?.[1] : undefined;
}

export type RepositoryDataResult =
	| {
			readonly error: string;
			readonly success: false;
	  }
	| {
			readonly name: string;
			readonly success: true;
			readonly url: string;
	  };

export async function getRepositoryDataAsync(): Promise<RepositoryDataResult> {
	const repositoryUrl = await getUrlFromConfigurationAsync();
	if (!repositoryUrl)
		return {
			error: "Failed to determine the repository URL. Make sure you are in a git repository.",
			success: false,
		};

	const repositoryName = await getRepositoryNameFromConfigurationAsync(repositoryUrl);
	if (!repositoryName)
		return {
			error: `Failed to determine the repository name from URL: ${repositoryUrl}. Make sure the URL is valid and ends with '.git'.`,
			success: false,
		};

	return { name: repositoryName, success: true, url: repositoryUrl };
}

export async function getGuaranteedRepositoryNameAsync(): Promise<string> {
	const repositoryName = await getRepositoryNameFromConfigurationAsync();
	if (repositoryName) return repositoryName;

	const folderName = basename(CWD);
	if (!folderName) {
		scriptConsole.warn("Failed to determine the current working directory name.");
		return "smart-bun-cli-template";
	}

	return folderName;
}
