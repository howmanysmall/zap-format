const HEX_DIGITS = "0123456789abcdef";
function formatByte(character: string): string {
	const code = character.charCodeAt(0);
	return `\\u${HEX_DIGITS[code >>> 12]}${HEX_DIGITS[(code >>> 8) & 0xf]}${HEX_DIGITS[(code >>> 4) & 0xf]}${HEX_DIGITS[code & 0xf]}`;
}

/**
 * Escapes a string for safe inclusion in JSON or similar formats.
 *
 * @example
 *
 * ```typescript
 * const safe = escapeString("foo\nbar"); // "foo\u000abar"
 * ```
 *
 * @param value - The string to escape.
 * @returns The escaped string.
 */
export function escapeString(value: string): string {
	let result = "";
	for (const character of value) {
		const code = character.charCodeAt(0);
		result += code <= 0x1f || character === "\\" || character === '"' ? formatByte(character) : character;
	}
	return result;
}

/**
 * Returns the shortest string representation of a number that preserves its
 * value.
 *
 * @example
 *
 * ```typescript
 * const s = getSignificantDigits(0.1 + 0.2); // "0.3"
 * ```
 *
 * @param number - The number to format.
 * @returns The shortest string that, when parsed, equals the original number.
 */
export function getSignificantDigits(number: number): string {
	const asString = number.toString();
	if (Number(asString) === number) return asString;

	let minimumPrecision = 15;
	let maximumPrecision = 99;

	while (minimumPrecision <= maximumPrecision) {
		const precision = Math.floor((minimumPrecision + maximumPrecision) / 2);
		const formatted = number.toPrecision(precision);
		const parsed = Number(formatted);

		if (parsed === number) {
			// eslint-disable-next-line sonar/no-dead-store -- not useless?
			maximumPrecision = precision - 1;

			let finalPrecision = precision;
			for (let index = minimumPrecision; index <= precision; index += 1) {
				const testFormatted = number.toPrecision(index);
				if (Number(testFormatted) === number) {
					finalPrecision = index;
					break;
				}
			}
			return number.toPrecision(finalPrecision);
		}

		minimumPrecision = precision + 1;
	}

	throw new Error(`Couldn't reproduce accurate number for ${number}.`);
}

/**
 * Adds double quotes around a string and escapes special characters.
 *
 * @example
 *
 * ```typescript
 * const quoted = addQuoted("foo\nbar"); // '"foo\\nbar"'
 * ```
 *
 * @param value - The string to quote and escape.
 * @returns The quoted and escaped string.
 */
export function addQuoted(value: string): string {
	const stringBuilder: Array<string> = ['"'];
	let length = 1;

	for (const character of value)
		switch (character) {
			case "\n": {
				stringBuilder[length++] = "\\n";
				break;
			}

			case "\r": {
				stringBuilder[length++] = "\\r";
				break;
			}

			case "\0": {
				stringBuilder[length++] = "\\0";
				break;
			}

			case '"':
			case "\\": {
				stringBuilder[length++] = "\\";
				stringBuilder[length++] = character;
				break;
			}

			default: {
				stringBuilder[length++] = character;
				break;
			}
		}

	return `${stringBuilder.join("")}"`;
}
