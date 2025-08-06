import { defineCommand, option } from "@bunli/core";

import chalk from "chalk";
import { createNamespaceLogger } from "logging/logger-utilities";
import { formatFileAsync } from "utilities/zap-format";
import { z } from "zod/mini";

const logger = createNamespaceLogger("format");

const consoleLog = console.log;

const format = defineCommand({
	name: "format",
	description: "Formats a Zap configuration file.",
	handler: async ({ flags }) => {
		const { overwrite, zapFile } = flags;
		const file = Bun.file(zapFile);
		const exists = await file.exists();
		if (!exists) {
			logger.error(`Zap configuration file does not exist at ${zapFile}`);
			return;
		}

		const formattedContent = await formatFileAsync(file);
		if (overwrite) {
			await file.write(formattedContent);
			consoleLog(`Formatted content written to ${chalk.green(zapFile)}`);
		} else await Bun.stdout.write(formattedContent);
	},
	options: {
		overwrite: option(z._default(z.boolean(), false), {
			description: "Overwrite the original file with the formatted content.",
			short: "o",
		}),
		zapFile: option(z._default(z.string(), "net.zap"), {
			description: "The Zap configuration file to format.",
			short: "f",
		}),
	},
});

export default format;
