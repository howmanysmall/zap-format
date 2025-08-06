import ZapFormatter from "./classes/zap-formatter";
import ZapLexer from "./classes/zap-lexer";
import ZapParser from "./classes/zap-parser";
import { fromPathLike, type PathLike } from "./file-utilities";

/**
 * Formats a Zap configuration string into its canonical representation.
 *
 * @param input - The Zap configuration string to format.
 * @returns The formatted Zap configuration string.
 * @throws {Error} If formatting fails.
 */
export function format(input: string): string {
	try {
		const tokens = new ZapLexer(input).tokenize();
		const zapConfigurationNode = new ZapParser(tokens).parse();
		return new ZapFormatter().format(zapConfigurationNode);
	} catch (error) {
		throw new Error(`Zap formatting error: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Formats a Zap configuration file from a given path-like value.
 *
 * @param filePathLike - The file path or Bun file handle to read and format.
 * @returns The formatted Zap configuration string.
 * @throws {Error} If reading or formatting fails.
 */
export async function formatFileAsync(filePathLike: PathLike): Promise<string> {
	const content = await Bun.file(fromPathLike(filePathLike)).text();
	return format(content);
}

/** The result of validating a Zap configuration string. */
export type ValidationResult =
	| {
			readonly error: string;
			readonly isValid: false;
	  }
	| { readonly isValid: true };

/**
 * Validates a Zap configuration string.
 *
 * @param input - The Zap configuration string to validate.
 * @returns An object indicating whether the input is valid, and an error
 *   message if not.
 */
export function validate(input: string): ValidationResult {
	try {
		new ZapParser(new ZapLexer(input).tokenize()).parse();
		return { isValid: true };
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : String(error),
			isValid: false,
		};
	}
}
