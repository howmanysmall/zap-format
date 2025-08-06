import { createCLI } from "@bunli/core";

import cleanLogs from "commands/clean-logs";
import format from "commands/format";
import { description, name, version } from "constants/package-constants";

// Optimize startup by pre-allocating CLI with known commands
const cli = createCLI({ name, description, version });

cli.command(cleanLogs);
cli.command(format);

// Check if this is the main module to allow for testing
if (import.meta.main) await cli.run();
